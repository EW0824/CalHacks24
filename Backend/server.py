import io
import subprocess
import whisper
import tempfile
from flask import Flask, request, jsonify

app = Flask(__name__)


def add_cors_headers(response, status):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    return response, status


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

        model = whisper.load_model("base")
        result = model.transcribe(audio_file_path)

    # os.remove(audio_file_path)

    # return audio_file_path
    return result["text"]


def transcribe_video(video_file: io.BytesIO) -> str:
    """Transcribes the given video file using Whisper."""
    # Create a temporary file to save the uploaded video
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video_file:
        temp_video_file.write(video_file.read())
        temp_video_file.flush()  # Ensure it's written before we read

        # Extract audio using FFmpeg
        text = extract_text(temp_video_file.name)

    # os.remove(temp_video_file.name)

    return text


@app.route("/api/postVoice", methods=["POST"])
def upload_video() -> tuple:
    # Check if the post request has the file part
    if "file" not in request.files:
        response = jsonify({"error": "No file part in the request"})
        return add_cors_headers(response, 400)

    file = request.files["file"]
    if file.filename == "" or file.filename is None:
        response = jsonify({"error": "No file selected for uploading"})
        return add_cors_headers(response, 400)

    try:
        # Read the uploaded file into a BytesIO object
        video_buffer = io.BytesIO()
        file.save(video_buffer)  # Save the uploaded file to the buffer
        video_buffer.seek(0)  # Move to the beginning of the buffer for reading

        # Transcribe the uploaded video file
        transcription_text = transcribe_video(video_buffer)

        response = jsonify({"transcription": transcription_text})
        return add_cors_headers(response, 200)
    except Exception as e:
        print(e)
        response = jsonify({"error": str(e)})
        return add_cors_headers(response, 500)


if __name__ == "__main__":
    app.run(port=8080, debug=True)
