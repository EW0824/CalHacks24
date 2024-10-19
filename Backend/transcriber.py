# transcriber.py
import moviepy.editor
import whisper
import ssl

# Set up unverified SSL context if needed
ssl._create_default_https_context = ssl._create_unverified_context

def transcribe_video(video_file_path):
    """Transcribes the given video file using Whisper."""
    # Extract audio from the video file
    video = moviepy.editor.VideoFileClip(video_file_path)
    audio = video.audio
    audio_file_path = "audio.wav"
    audio.write_audiofile(audio_file_path)

    # Load the Whisper model and perform transcription
    model = whisper.load_model("base")
    result = model.transcribe(audio_file_path)

    # Clean up the generated audio file (optional)
    return result["text"]
