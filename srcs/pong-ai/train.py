"""Train a PPO agent to play Pong against the real game service.

Usage:
    GAME_SERVICE_URL=http://localhost:8080/api/game python3 train.py

The game service must be running with the rl/ endpoints active.
The trained model is saved to models/best_model.zip.
"""

import os
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.callbacks import (
    EvalCallback,
    CheckpointCallback,
    CallbackList,
)
from stable_baselines3.common.monitor import Monitor
from pong_env import PongEnv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
TOTAL_TIMESTEPS   = 1_000_000   # increase for a stronger model
EVAL_FREQ         = 10_000      # evaluate every N steps
N_EVAL_EPISODES   = 5           # episodes per evaluation
CHECKPOINT_FREQ   = 50_000      # save a checkpoint every N steps
MODEL_SAVE_PATH   = "models/best_model"
LOG_DIR           = "logs/"
CHECKPOINT_DIR    = "models/checkpoints/"

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs("models", exist_ok=True)

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
print("[train] Creating training environment...")
train_env = Monitor(PongEnv(), LOG_DIR)

print("[train] Checking environment...")
check_env(train_env, warn=True)

print("[train] Creating eval environment...")
eval_env = Monitor(PongEnv(), LOG_DIR)

# ---------------------------------------------------------------------------
# Callbacks
# ---------------------------------------------------------------------------
eval_callback = EvalCallback(
    eval_env,
    best_model_save_path=f"models/",
    log_path=LOG_DIR,
    eval_freq=EVAL_FREQ,
    n_eval_episodes=N_EVAL_EPISODES,
    deterministic=True,
    render=False,
    verbose=1,
)

checkpoint_callback = CheckpointCallback(
    save_freq=CHECKPOINT_FREQ,
    save_path=CHECKPOINT_DIR,
    name_prefix="pong_checkpoint",
    verbose=1,
)

callbacks = CallbackList([eval_callback, checkpoint_callback])

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
# Resume from existing model if present, otherwise start fresh.
if os.path.exists(f"{MODEL_SAVE_PATH}.zip"):
    print(f"[train] Resuming from {MODEL_SAVE_PATH}.zip")
    model = PPO.load(
        MODEL_SAVE_PATH,
        env=train_env,
        verbose=1,
        tensorboard_log=LOG_DIR,
    )
else:
    print("[train] Starting fresh PPO model")
    model = PPO(
        "MlpPolicy",
        train_env,
        verbose=1,
        tensorboard_log=LOG_DIR,
        # Tuned hyperparameters for Pong
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,   # encourage exploration
    )

# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
print(f"[train] Training for {TOTAL_TIMESTEPS:,} timesteps...")
model.learn(
    total_timesteps=TOTAL_TIMESTEPS,
    callback=callbacks,
    reset_num_timesteps=False,  # keep step counter when resuming
    progress_bar=True,
)

# Save final model
model.save(MODEL_SAVE_PATH)
print(f"[train] Done. Model saved to {MODEL_SAVE_PATH}.zip")

train_env.close()
eval_env.close()
