# transcriber.py
from moviepy.editor import VideoFileClip
import whisper
import ssl
import os

# Set up unverified SSL context if needed
ssl._create_default_https_context = ssl._create_unverified_context


def split_video_into_clips(video_file_path, clip_duration=5):
    """Splits the video into smaller clips of fixed duration."""
    video = VideoFileClip(video_file_path)
    clips = []
    for i in range(0, int(video.duration), clip_duration):
        start_time = i
        end_time = min(i + clip_duration, video.duration)
        clips.append(
            (video.subclip(start_time, end_time), end_time)
        )  # Store the clip with end time
    return clips


def extract_video_audio(video_file_path, clip_duration=5):
    clips = split_video_into_clips(video_file_path, clip_duration)

    i = 0
    video_file_paths = []
    audio_file_paths = []
    all_transcriptions = []
    for clip, clip_end_time in clips:
        audio_file_path = f"audio_{i}.wav"
        vid_file_path = f"video_{i}.mp4"
        video_file_paths.append(vid_file_path)
        audio_file_paths.append(audio_file_path)

        clip.audio.write_audiofile(audio_file_path)
        clip.write_videofile(vid_file_path)
        # clip.write_videofile(vid_file_path, codec="libx264", audio_codec="aac")

        transcription = transcribe_video(vid_file_path, clip_end_time)
        all_transcriptions.append(transcription)

        i += 1

    return (all_transcriptions, video_file_paths, audio_file_paths)


def transcribe_video(audio_file_path, clip_end_time):
    """Transcribes the given video file in clips using Whisper with aligned timestamps."""
    model = whisper.load_model("base")
    result = model.transcribe(audio_file_path, task="transcribe", language="en")
    transcription = {clip_end_time: result["text"]}

    return transcription


def process_transcription(transcription, clip_start_time, clip_end_time):
    """Processes the transcription and assigns clip start and end times."""
    blocks = transcription.split("\n\n")
    processed_lines = []
    for block in blocks:
        lines = block.split("\n")
        if len(lines) >= 3:
            text = lines[2]  # Extract the actual transcription text line
            processed_line = f"[{format_time(clip_start_time)} - {format_time(clip_end_time)}] {text}"
            processed_lines.append(processed_line)
    return "\n".join(processed_lines)


def format_time(seconds):
    """Converts seconds to 'H:MM:SS' format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours}:{minutes:02}:{seconds:02}"
