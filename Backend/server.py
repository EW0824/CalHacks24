import io
import os
import subprocess
import whisper
import tempfile
from flask import Flask, request, jsonify

app = Flask(__name__)


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


@app.route("/api/postExpressions", methods=["POST", "OPTIONS"])
def return_expressions() -> tuple:
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

        behaviors = {"a": 30, "b": 40, "c": 30}
        return jsonify({"behaviors": behaviors}), 200
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
