import io
import os
import tempfile
import asyncio
from flask import Flask, request, jsonify
from datetime import datetime
from dotenv import load_dotenv
from hume import AsyncHumeClient
from hume.expression_measurement.batch import Face, Models
from hume.expression_measurement.batch.types import InferenceBaseRequest
import json
from transcription import extract_video_audio
from groq import Groq

GROQ_KEY = os.getenv("GROQ_KEY")
API_KEY = os.getenv("API_KEY")

load_dotenv()


########
# SETUP
########

app = Flask(__name__)


def get_top_3_facs(predictions):
    top_facs_per_clip = []  # List to hold results for all clips

    for pred in predictions:  # Each file
        for prediction in pred.results.predictions:  # Per file
            facs_map = {}

            for grouped_preds in prediction.models.face.grouped_predictions:
                for pred in grouped_preds.predictions:  # Per frame per file
                    facs = pred.facs

                    for facs_score in facs:
                        # Store the score along with the file name
                        if facs_score.name not in facs_map:
                            facs_map[facs_score.name] = (
                                facs_score.score,
                                prediction.file,
                            )
                        else:
                            # Update the score, but keep the same file name
                            existing_score, _ = facs_map[facs_score.name]
                            facs_map[facs_score.name] = (
                                existing_score + facs_score.score,
                                prediction.file,
                            )

            # Average the scores by the number of frames (assuming 15 frames)
            for key in facs_map.keys():
                score, file = facs_map[key]
                facs_map[key] = (score / 15.0, file)

            # Get the top 3 FACS scores sorted by score
            top_3_facs = sorted(facs_map.items(), key=lambda x: x[1][0], reverse=True)[
                :3
            ]

            # Store the top FACS scores for this clip
            top_facs_per_clip.extend(
                (facs_name, score, file) for facs_name, (score, file) in top_3_facs
            )

    return top_facs_per_clip


async def process_videos_hume(client, files):
    face_config = Face(facs={})
    models_chosen = Models(face=face_config)
    stringified_configs = InferenceBaseRequest(models=models_chosen)

    job_id = (
        await client.expression_measurement.batch.start_inference_job_from_local_file(
            json=stringified_configs, file=files
        )
    )
    await poll_for_completion(client, job_id)
    job_predictions = await client.expression_measurement.batch.get_job_predictions(
        id=job_id
    )
    top_facs_scores = get_top_3_facs(job_predictions)
    return top_facs_scores


async def poll_for_completion(client: AsyncHumeClient, job_id, timeout=120):
    """
    Polls for the completion of a job with a specified timeout (in seconds).

    Uses asyncio.wait_for to enforce a maximum waiting time.
    """
    try:
        # Wait for the job to complete or until the timeout is reached
        await asyncio.wait_for(poll_until_complete(client, job_id), timeout=timeout)
    except asyncio.TimeoutError:
        # Notify if the polling operation has timed out
        print(f"Polling timed out after {timeout} seconds.")


async def poll_until_complete(client: AsyncHumeClient, job_id):
    """
    Continuously polls the job status until it is completed, failed, or an unexpected status is encountered.

    Implements exponential backoff to reduce the frequency of requests over time.
    """
    last_status = None
    delay = 1  # Start with a 1-second delay

    while True:
        # Wait for the specified delay before making the next status check
        await asyncio.sleep(delay)

        # Retrieve the current job details
        job_details = await client.expression_measurement.batch.get_job_details(job_id)
        status = job_details.state.status

        # If the status has changed since the last check, print the new status
        if status != last_status:
            print(f"Status changed: {status}")
            last_status = status

        if status == "COMPLETED":
            # Job has completed successfully
            print("\nJob completed successfully:")
            # Convert timestamps from milliseconds to datetime objects
            created_time = datetime.fromtimestamp(
                job_details.state.created_timestamp_ms / 1000
            )
            started_time = datetime.fromtimestamp(
                job_details.state.started_timestamp_ms / 1000
            )
            ended_time = datetime.fromtimestamp(
                job_details.state.ended_timestamp_ms / 1000
            )
            # Print job details neatly
            print(f"  Created at: {created_time}")
            print(f"  Started at: {started_time}")
            print(f"  Ended at:   {ended_time}")
            print(f"  Number of errors: {job_details.state.num_errors}")
            print(f"  Number of predictions: {job_details.state.num_predictions}")
            break
        elif status == "FAILED":
            # Job has failed
            print("\nJob failed:")
            # Convert timestamps from milliseconds to datetime objects
            created_time = datetime.fromtimestamp(
                job_details.state.created_timestamp_ms / 1000
            )
            started_time = datetime.fromtimestamp(
                job_details.state.started_timestamp_ms / 1000
            )
            ended_time = datetime.fromtimestamp(
                job_details.state.ended_timestamp_ms / 1000
            )
            # Print error details neatly
            print(f"  Created at: {created_time}")
            print(f"  Started at: {started_time}")
            print(f"  Ended at:   {ended_time}")
            print(f"  Error message: {job_details.state.message}")
            break

        # Increase the delay exponentially, maxing out at 16 seconds
        delay = min(delay * 2, 16)


def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    return response


@app.after_request
def after_request(response):
    return add_cors_headers(response)


# ########
# # EVI API
# ########

# @app.route("/api/startConversation", methods=["POST", "OPTIONS"])
# def start_conversation_route():
#     """
#     Start a conversation with Hume AI's EVI via WebSocket and manage audio input/output
#     """
#     if request.method == "OPTIONS":
#         return jsonify({}), 200  # Respond to preflight request

#     # Extract user message from request body
#     data = request.get_json()
#     user_message = data.get("message", "")

#     try:
#         # Start the conversation
#         response = start_conversation(user_message)
#         return jsonify(response), 200

#     except Exception as e:
#         print(f"Error starting conversation: {e}")
#         return jsonify({"error": str(e)}), 500


########
# POST PROCESSING
########


@app.route("/api/postVoice", methods=["POST", "OPTIONS"])
async def upload_video() -> tuple:
    if request.method == "OPTIONS":
        return jsonify({}), 200  # Respond to preflight request

    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected for uploading"}), 400

    try:
        video_buffer = io.BytesIO()
        file.save(video_buffer)
        video_buffer.seek(0)

        with tempfile.NamedTemporaryFile(
            suffix=".mp4", delete=False
        ) as temp_video_file:
            temp_video_file.write(video_buffer.read())
            temp_video_file.flush()
            all_transcriptions, video_files, audio_files = extract_video_audio(
                temp_video_file.name
            )
            print(all_transcriptions, video_files)

            client = AsyncHumeClient(api_key=API_KEY)

            local_filepaths = [open(file, "rb") for file in video_files]
            face_config = Face(facs={})
            models_chosen = Models(face=face_config)
            stringified_configs = InferenceBaseRequest(models=models_chosen)
            job_id = await client.expression_measurement.batch.start_inference_job_from_local_file(
                json=stringified_configs, file=local_filepaths
            )
            await poll_for_completion(client, job_id, timeout=120)
            job_predictions = (
                await client.expression_measurement.batch.get_job_predictions(id=job_id)
            )
            top_facs_scores = get_top_3_facs(job_predictions)

        for file in video_files + audio_files:
            os.remove(file)

        os.remove(temp_video_file.name)

        return jsonify(
            {"transcription": all_transcriptions, "behavior": top_facs_scores}
        ), 200
    except Exception as e:
        print(f"Error during transcription: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/postFeedback", methods=["POST", "OPTIONS"])
def get_feedback() -> tuple:
    if request.method == "OPTIONS":
        return jsonify({}), 200  # Respond to preflight request

    try:
        data = request.get_json()
        transcript = str(data.get("transcript", "no response"))
        questions = data.get("questions", None)  # No need for explicit typing here
        length_of_transcript = data.get("length", len(questions))
        behaviors = data.get("behaviors", None)
        emotions = data.get("emotions", None)

        client = Groq(
            api_key=GROQ_KEY,
        )

        facial_expression_weights = {
            "AU43 EYE CLOSURE": -1,
            "HAND OVER FOREHEAD": -1,
            "AU54 HEAD DOWN": -1,
            "HAND OVER MOUTH": -1,
            "AU7 LIDS TIGHT": -1,
            "AU12 LIP CORNER PULLER": 1,
            "AU17 CHIN RAISER": 0,
            "AU9 NOSE WRINKLE": -1,
            "CRY": -2,
            "SMILE": 1,
            "LAUGH": 2,
            "AU6 CHEEK RAISE": 1,
            "AU53 HEAD UP": 0,
            "AU19 TONGUE SHOW": 0,
            "LICKING LIP": 0,
            "AU37 LIP WIPE": 0,
            "TENSE BROW LOWERER": -1,
            "AU32 BITE": 0,
            "AU10 UPPER LIP RAISER": 0,
            "AU1 INNER BROW RAISE": -1,
            "WIDE-EYED": 1,
            "AU5 UPPER LID RAISE": 0,
            "JAW DROP": -1,
            "GASP": -1,
            "AU27 MOUTH STRETCH": 0,  # Add more expressions as needed from the image
        }
        emotion_weights = {
            "Admiration": 1,
            "Adoration": 0,
            "Aesthetic appreciation": 0,
            "Amusement": 0,
            "Anger": -2,
            "Anxiety": -2,
            "Awe": 0,
            "Awkwardness": -1,
            "Boredom": -1,
            "Calmness": 1,
            "Concentration": 1,
            "Confusion": -1,
            "Contemplation": 1,
            "Contempt": -2,
            "Contentment": 0,
            "Craving": 0,
            "Determination": 1,
            "Desire": 0,
            "Disappointment": -2,
            "Disapproval": -1,
            "Disgust": -2,
            "Distress": -2,
            "Doubt": -1,
            "Ecstasy": 0,
            "Embarrassment": -1,
            "Empathetic pain": -1,
            "Enthusiasm": 1,
            "Entrancement": 0,
            "Envy": -1,
            "Excitement": 0,
            "Fear": -2,
            "Gratitude": 1,
            "Guilt": -2,
            "Horror": -2,
            "Interest": 0,
            "Joy": 0,
            "Love": 0,
            "Nostalgia": 0,
            "Pain": -2,
            "Pride": 1,
            "Realization": 0,
            "Relief": 0,
            "Romance": 0,
            "Sadness": -2,
            "Sarcasm": -1,
            "Satisfaction": 0,
            "Shame": -2,
            "Surprise(negative)": -1,
            "Surprise(positive)": 0,
            "Sympathy": 0,
            "Tiredness": -1,
            "Triumph": 0,
        }

        # LLM Quality Scoring Function using Groq Client
        def get_llm_quality_score_groq(transcript, questions, behaviors, emotions):
            try:
                client = Groq(api_key=GROQ_KEY)
                length = min(len(questions), len(transcript))
                quality_scores = []
                for i in range(length):
                    chat_completion = client.chat.completions.create(
                        messages=[
                            {
                                "role": "system",
                                "content": """
                                The response should be strictly less than 70 words. You are an interview coach.
                                Your task is to evaluate the performance and give specific feedback on how the user
                                performs in their interview. Make your performance assessment based on a variety of data
                                sources including facial expressions, quality and depth of answers, and emotions.
                                Outline both strengths and weaknesses of the user including ways to improve. Be extremely thorough and specific in your feedback.
                                Here are some notes about the data:
                                The transcript is a dictionary where the key is the finish time in seconds of the value in the recorded video and the value is the actual text the user spoke.
                                The questions are the questions the LLM asks which are in the form of an array.
                                The emotions is a dictionary of length 48 containing an emotion as a key and its corresponding score as a value.
                                """,
                            },
                            {
                                "role": "user",
                                "content": f"""
                                Match the question, '{questions[i]}', with the response present in the transcript, '{transcript}'.
                                Make use of the timestamps, which are the keys in the transcript, to identify which questions the transcript data points belong to.
                                Also, consider the behaviors, '{behaviors}', of the user as they answer the questions.
                                And take into account the emotions, '{emotions}', of the user as they answer these interview questions.
                                Provide comprehensive feedback to the user on their interview performance.
                                Address things they did well and areas for improvement. Reference the quality, relevance, and completeness of the response as well as the user's emotions and behaviors.
                                Assign a score out of 40 for the response quality based on psychological literature on successful interviews.
                                """,
                            },
                        ],
                        model="llama-3.1-8b-instant",
                    )
                    # Parse the score from the LLM response (assuming LLM returns a clear score statement)
                    feedback = chat_completion.choices[0].message.content
                    try:
                        # Extract the score if mentioned in the feedback (this part may change based on LLM response format)
                        score = float(
                            [word for word in feedback.split() if word.isdigit()][0]
                        )  # Example parsing for a numeric score
                        quality_scores.append(score)
                    except (IndexError, ValueError):
                        quality_scores.append(
                            30
                        )  # Assign a default score if parsing fails
                # Calculate the average quality score across all questions
                return (
                    sum(quality_scores) / len(quality_scores) if quality_scores else 0
                )
            except Exception as e:
                print(f"Error fetching LLM quality score: {e}")
                return 20  # Default value if the LLM call fails

        def calculate_emotional_score(emotions, emotion_weights):
            total_score = 0
            for interval in emotions:
                for time, emotion_data in interval.items():
                    if isinstance(emotion_data, dict):
                        for emotion, prominence in emotion_data.items():
                            weight = emotion_weights.get(
                                emotion, 0
                            )  # Get the weight, default to 0 if emotion not found
                            total_score += weight * prominence
            return total_score

        def calculate_updated_facial_expression_score(
            facial_expressions, facial_expression_weights
        ):
            expression_score = 0
            for interval in facial_expressions:
                if isinstance(interval, dict):
                    for expression, prominence in interval.items():
                        weight = facial_expression_weights.get(
                            expression.upper(), 0
                        )  # Default to 0 if not in the weights dictionary
                        expression_score += weight * prominence
            return expression_score

        # Calculate the final score for the interview (includes LLM integration)
        def calculate_interview_score_with_llm(
            emotions,
            facial_expressions,
            emotion_weights,
            transcript,
            questions,
            behaviors,
        ):
            emotional_score = calculate_emotional_score(emotions, emotion_weights)
            facial_expression_score = calculate_updated_facial_expression_score(
                facial_expressions, facial_expression_weights
            )
            # Fetch the LLM quality score using the Groq integration
            llm_quality_score = get_llm_quality_score_groq(
                transcript, questions, behaviors, emotions
            )
            # Normalize and combine scores (weights can be adjusted based on the importance of each factor)
            total_emotional_score = max(
                0, min(emotional_score, 40)
            )  # Cap at 40 for normalization
            total_facial_score = max(
                0, min(facial_expression_score, 20)
            )  # Cap at 20 for normalization
            # Final score calculation with LLM quality score
            final_score = total_emotional_score + total_facial_score + llm_quality_score
            return final_score

        facial_expressions = behaviors  # For this example, assuming behaviors and facial_expressions are similar
        # Calculate the final interview score using LLM integration
        final_interview_score = calculate_interview_score_with_llm(
            emotions,
            facial_expressions,
            emotion_weights,
            transcript,
            questions,
            behaviors,
        )
        print("Final Interview Score (Out of 100):", final_interview_score)

        length = min(len(questions), length_of_transcript)
        print("transcript", length_of_transcript, "question: ", len(questions))

        answers = []
        print(questions)
        for i in range(length):
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": """"
                The response should be strictly less than 70 words. You are an interview coach. 
                Your task is to evaluate the performance and give specific feedback on how 
                the user performs in their interview. Make your performance assessment based on a 
                variety of data sources including facial expressions, quality and depth of answers, 
                and emotions. Outline both strengths and weaknesses of the user including 
                ways to improve. Be extremely thorough and specific in your feedback.
                Here are some notes about the data:
                The transcript is a dictionary where the key is the finish time in seconds
                of the value in the recorded video and the value is the actual text the
                user spoke. The questions are the questions the LLM asks which are in the
                form of an array. The emotions is a dictionary of length 48 containing an
                emotion as a key and its corresponding score as a value.
                """,
                    },
                    {
                        "role": "user",
                        "content": f"""
                "The response should be strictly less than 70 words. Match the questions, {questions[i]}, with the responses present in the transcripts,
                {transcript}. Make use of the time stamps which are the keys in the transcript
                to identify which questions the transcript data points belong to. Also make sure
                to take into account the behaviors, {behaviors} of the users as they answer the
                questions. And also take into account the emotions, {emotions} of the users as they
                answer these interview questions. You need to give comprehensive feedback to the
                user about how they did on their interview. Talk about things they did well as well
                as things they need to improve upon. To do this, reference their response content,
                its relevance, its quality, as well as the user's emotions and behaviors. Give them a
                question by question breakdown of what they can do better. And lastly, give them an
                overall interview success score based on psychological literature on successful
                interviews."
                """,
                    },
                ],
                model="llama-3.1-8b-instant",
            )
            answers.append(chat_completion.choices[0].message.content)

        print(answers)

        return jsonify({"feedback": answers, "score": final}), 200
    except Exception as e:
        print(f"Error getting feedback: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=8080, debug=True)
