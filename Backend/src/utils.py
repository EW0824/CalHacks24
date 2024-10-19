import io
import os
import subprocess
import tempfile
import whisper

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