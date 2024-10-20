import io
import os
import subprocess
import whisper
import tempfile
from flask import Flask, request, jsonify, Response
import glob
import asyncio
from moviepy.editor import VideoFileClip
from hume import AsyncHumeClient
from hume.expression_measurement.batch import Face, Models
from hume.expression_measurement.batch.types import InferenceBaseRequest
from datetime import datetime
from cartesia import Cartesia
from dotenv import load_dotenv
import wave

API_KEY = os.getenv("API_KEY")

load_dotenv()

app = Flask(__name__)


def split_video(file, segment_length, output_dir):
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_file:
        temp_file.write(file.read())
        temp_file.flush()

        print("Enter split video")
        clip = VideoFileClip(temp_file.name)
        print(clip)
        duration = clip.duration

        start_time = 0
        i = 1

        # Extract the filename without extension
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        print(output_dir)
        while start_time < duration:
            end_time = min(start_time + segment_length, duration)
            output = os.path.join(output_dir, f"{i}.mp4")
            clip.subclip(start_time, end_time).write_videofile(
                output, codec="libx264", audio_codec="aac"
            )
            start_time = end_time
            i += 1
        return i - 1


def get_top_3_facs(predictions):
    top_facs_per_clip = []  # List to hold results for all clips

    for pred in predictions:  # Each file
        print("source")
        print(pred.source)

        for prediction in pred.results.predictions:  # Per file
            print(f"file: {prediction.file}")
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


def extract_text(video_file_path: str) -> str:
    """Extracts audio from a video file using FFmpeg via subprocess."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as audio_temp_file:
        audio_file_path = audio_temp_file.name

        # FFmpeg command to extract audio
        command = [
            "ffmpeg",
            "-i",
            video_file_path,  # Input video file
            "-ac",
            "1",  # Convert to mono
            "-ar",
            "16000",  # Set sampling rate to 16kHz
            audio_file_path,  # Output audio file
            "-y",  # Overwrite output file if it exists
        ]

        # Run the FFmpeg command
        subprocess.run(command, check=True)  # Raises CalledProcessError on failure

        # Load the Whisper model and perform transcription
        model = whisper.load_model("base")
        result = model.transcribe(audio_file_path)

    os.remove(audio_file_path)  # Clean up
    return result["text"]


def transcribe_video(video_file: io.BytesIO) -> str:
    """Transcribes the given video file using Whisper."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video_file:
        temp_video_file.write(video_file.read())
        temp_video_file.flush()  # Ensure it's written before we read

        # Extract audio using FFmpeg
        text = extract_text(temp_video_file.name)

    os.remove(temp_video_file.name)  # Clean up
    return text


@app.route("/api/postVoice", methods=["POST", "OPTIONS"])
def upload_video() -> tuple:
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

        transcription_text = transcribe_video(video_buffer)

        return jsonify({"transcription": transcription_text}), 200
    except Exception as e:
        print(f"Error during transcription: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/speak", methods=["POST", "OPTIONS"])
def return_voice():
    if request.method == "OPTIONS":
        return jsonify({}), 200  # Respond to preflight request

    try:
        client = Cartesia(api_key=os.environ.get("CARTESIA_API_KEY"))
        data = request.get_json()
        transcript = data.get("question", "")

        voice_id = "a0e99841-438c-4a64-b679-ae501e7d6091"
        voice = client.voices.get(id=voice_id)
        model_id = "sonic-english"

        output_format = {
            "container": "raw",
            "encoding": "pcm_s16le",
            "sample_rate": 48000,
        }

        def generate_wav():
            # Create an in-memory buffer to write WAV data
            wav_buffer = io.BytesIO()

            # Prepare to write WAV data
            with wave.open(wav_buffer, "wb") as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 32-bit float PCM (4 bytes)
                wav_file.setframerate(48000)  # Sample rate

                # Stream the audio and write to WAV
                for output in client.tts.sse(
                    model_id=model_id,
                    transcript=transcript,
                    voice_embedding=voice["embedding"],
                    stream=True,
                    output_format=output_format,
                ):
                    buffer = output["audio"]
                    wav_file.writeframes(buffer)

            # Move to the beginning of the buffer
            wav_buffer.seek(0)
            return wav_buffer.read()

        # Return the generated WAV audio as a response
        return Response(
            generate_wav(),
            content_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=output.wav",
                "Cache-Control": "no-cache",
            },
        )

    except Exception as e:
        print(f"Error processing expressions: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/postExpressions", methods=["POST", "OPTIONS"])
async def return_expressions() -> tuple:
    if request.method == "OPTIONS":
        return jsonify({}), 200  # Respond to preflight request

    file = request.files["file"]
    print(file)
    if not file.filename:
        return jsonify({"error": "No file selected for uploading"}), 400

    try:
        print("Entered try")
        output_folder = "./split_videos"
        segment_length = 5  # Change to your desired segment length

        video_buffer = io.BytesIO()
        file.save(video_buffer)
        video_buffer.seek(0)

        # Split the video into segments
        split_video(video_buffer, segment_length, output_folder)
        # Initialize Hume client
        client = AsyncHumeClient(api_key=API_KEY)
        print("init client")

        video_files = glob.glob("./split_videos/*.mp4")
        local_filepaths = [open(file, "rb") for file in video_files]
        face_config = Face(facs={})
        models_chosen = Models(face=face_config)
        stringified_configs = InferenceBaseRequest(models=models_chosen)
        job_id = await client.expression_measurement.batch.start_inference_job_from_local_file(
            json=stringified_configs, file=local_filepaths
        )
        print("about to poll")
        await poll_for_completion(client, job_id, timeout=120)
        print("polling")
        job_predictions = await client.expression_measurement.batch.get_job_predictions(
            id=job_id
        )
        print("predictions")
        top_facs_scores = get_top_3_facs(job_predictions)
        print("top faces")

        for file in video_files:
            os.remove(file)
        return jsonify({"top_facs_scores": top_facs_scores}), 200

    except Exception as e:
        print(f"Error processing expressions: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/postFeedback", methods=["POST", "OPTIONS"])
def get_feedback() -> tuple:
    if request.method == "OPTIONS":
        return jsonify({}), 200  # Respond to preflight request

    try:
        data = request.get_json()
        transcript = str(data.get("transcript", "no response"))
        questions = data.get("questions", None)  # No need for explicit typing here
        behaviors = data.get("behaviors", None)

        behaviorFeedback = "You maintained good eye contact but appeared anxious at times. Practice will help reduce fidgeting."
        qaFeedback = "Your answers were mostly clear, but try to elaborate more on your experiences."
        score = 78

        return jsonify(
            {
                "behaviorFeedback": behaviorFeedback,
                "qaFeedback": qaFeedback,
                "score": score,
            }
        ), 200
    except Exception as e:
        print(f"Error getting feedback: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=8080, debug=True)
