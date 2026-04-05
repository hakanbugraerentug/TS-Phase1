# indir_modeller.py - internet bilgisayar¦-nda +ðal¦-+þt¦-r
from huggingface_hub import snapshot_download

# Whisper
snapshot_download(
    repo_id="Systran/faster-whisper-medium",
    local_dir=r"C:\transfer\modeller\whisper-medium"
)

# Pyannote diarization
snapshot_download(
    repo_id="pyannote/speaker-diarization-3.1",
    local_dir=r"C:\transfer\modeller\speaker-diarization-3.1",
    token="YOUR_HF_TOKEN_HERE"
)

# Pyannote segmentation (diarization'¦-n ba¦þ¦-ml¦-l¦-¦þ¦-)
snapshot_download(
    repo_id="pyannote/segmentation-3.0",
    local_dir=r"C:\transfer\modeller\segmentation-3.0",
    token="YOUR_HF_TOKEN_HERE"
)
