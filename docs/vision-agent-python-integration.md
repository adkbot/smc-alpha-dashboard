# Vision Trading Agent - Python Integration Guide

## Overview

This document provides the Python code structure and examples for implementing the Vision Trading Agent that analyzes trading videos and sends signals to the Supabase backend.

## Architecture

The Python agent runs externally (on your PC, cloud server, or hosting platform) and communicates with Supabase via three Edge Functions:

1. **vision-agent-signal** - Receives trading signals (ENTER/EXIT/IGNORE)
2. **vision-agent-status** - Updates agent status and video progress (heartbeat)
3. **vision-agent-video** - Manages video processing queue

## Required Python Packages

```bash
pip install opencv-python tensorflow numpy requests pytube pillow pytesseract mediapipe
```

## Configuration

```python
import os
from dataclasses import dataclass

@dataclass
class AgentConfig:
    # Supabase Configuration
    SUPABASE_URL = "https://zfefnlibzgkfbgdtagho.supabase.co"
    SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZWZubGliemdrZmJnZHRhZ2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzYyMzgsImV4cCI6MjA3Nzc1MjIzOH0.HXuS3QTggHlSsTh0XQtaNC_Q20xiY9X3WHcwukHRg6A"
    
    # User JWT Token (obtain from frontend after login)
    USER_JWT_TOKEN = "YOUR_USER_JWT_TOKEN_HERE"
    
    # Video Processing Configuration
    CHANNEL_NAME = "Rafael Oliveira Trader Raiz"
    PLAYLIST_URL = "https://www.youtube.com/playlist?list=..."
    
    # Model Configuration
    SEQ_LEN = 30  # Number of frames in sequence
    FRAME_STEP = 5  # Process every Nth frame
    CONFIDENCE_THRESHOLD = 0.70
    
    # Trading Configuration
    MAX_TRADES_DAY = 10
    SAFETY_STOP_LOSS_PCT = 2.0
    SYMBOL = "WIN$"
```

## 1. Video Download and Frame Extraction

```python
import cv2
from pytube import YouTube, Playlist
import os

class VideoProcessor:
    def __init__(self, config):
        self.config = config
        
    def download_video(self, video_url, output_path="downloads"):
        """Download video from YouTube"""
        os.makedirs(output_path, exist_ok=True)
        
        yt = YouTube(video_url)
        stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
        
        video_path = stream.download(output_path=output_path)
        
        return {
            'video_id': yt.video_id,
            'title': yt.title,
            'url': video_url,
            'path': video_path,
            'duration': yt.length
        }
    
    def extract_frames(self, video_path, frame_step=5):
        """Extract frames from video"""
        cap = cv2.VideoCapture(video_path)
        frames = []
        frame_count = 0
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_count % frame_step == 0:
                frames.append(frame)
            
            frame_count += 1
        
        cap.release()
        return frames, total_frames
```

## 2. Feature Extraction

```python
import cv2
import numpy as np
import pytesseract
import mediapipe as mp

class FeatureExtractor:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.5
        )
        
    def extract_features(self, frame):
        """Extract visual features from a single frame"""
        features = {}
        
        # 1. Hand Gesture Detection
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        
        if results.multi_hand_landmarks:
            hand_features = []
            for hand_landmarks in results.multi_hand_landmarks:
                landmarks = [[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark]
                hand_features.extend(np.array(landmarks).flatten())
            features['hands'] = hand_features
        else:
            features['hands'] = np.zeros(63)  # 21 landmarks * 3 coords
        
        # 2. Line/Arrow Detection (Hough Transform)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=50, maxLineGap=10)
        
        if lines is not None:
            features['lines_count'] = len(lines)
            features['lines_avg_angle'] = np.mean([np.arctan2(line[0][3]-line[0][1], line[0][2]-line[0][0]) for line in lines])
        else:
            features['lines_count'] = 0
            features['lines_avg_angle'] = 0
        
        # 3. Text/Number Detection (OCR)
        text = pytesseract.image_to_string(frame)
        features['text'] = text
        features['contains_numbers'] = any(char.isdigit() for char in text)
        
        # 4. Color Analysis (detect highlights/markers)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Detect red markers (common in trading videos)
        lower_red = np.array([0, 50, 50])
        upper_red = np.array([10, 255, 255])
        red_mask = cv2.inRange(hsv, lower_red, upper_red)
        features['red_intensity'] = np.sum(red_mask) / (frame.shape[0] * frame.shape[1])
        
        # Detect green markers
        lower_green = np.array([40, 50, 50])
        upper_green = np.array([80, 255, 255])
        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        features['green_intensity'] = np.sum(green_mask) / (frame.shape[0] * frame.shape[1])
        
        return features
    
    def create_feature_vector(self, features):
        """Convert features dict to numpy array"""
        vector = []
        
        if isinstance(features['hands'], list):
            vector.extend(features['hands'])
        else:
            vector.extend(features['hands'].tolist())
        
        vector.append(features['lines_count'])
        vector.append(features['lines_avg_angle'])
        vector.append(1 if features['contains_numbers'] else 0)
        vector.append(features['red_intensity'])
        vector.append(features['green_intensity'])
        
        return np.array(vector)
```

## 3. LSTM Model for Sequence Classification

```python
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

class SignalModel:
    def __init__(self, seq_len=30, feature_dim=68):
        self.seq_len = seq_len
        self.feature_dim = feature_dim
        self.model = self.build_model()
    
    def build_model(self):
        """Build LSTM model for sequence classification"""
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=(self.seq_len, self.feature_dim)),
            Dropout(0.3),
            LSTM(64, return_sequences=False),
            Dropout(0.3),
            Dense(32, activation='relu'),
            Dense(3, activation='softmax')  # 3 classes: ENTER, EXIT, IGNORE
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def predict(self, sequence):
        """Predict action from feature sequence"""
        # sequence shape: (seq_len, feature_dim)
        sequence = np.expand_dims(sequence, axis=0)  # Add batch dimension
        
        prediction = self.model.predict(sequence, verbose=0)
        action_idx = np.argmax(prediction)
        confidence = prediction[0][action_idx]
        
        actions = ['ENTER', 'EXIT', 'IGNORE']
        return actions[action_idx], float(confidence)
    
    def load_model(self, model_path):
        """Load trained model"""
        self.model = tf.keras.models.load_model(model_path)
```

## 4. Supabase Communication

```python
import requests
import json
from datetime import datetime

class SupabaseClient:
    def __init__(self, config):
        self.config = config
        self.base_url = f"{config.SUPABASE_URL}/functions/v1"
        self.headers = {
            "Authorization": f"Bearer {config.USER_JWT_TOKEN}",
            "Content-Type": "application/json"
        }
    
    def send_signal(self, video_id, frame_index, action, confidence, symbol="WIN$", features_summary=None):
        """Send trading signal to Supabase"""
        payload = {
            "video_id": video_id,
            "frame_index": frame_index,
            "action": action,
            "confidence": confidence,
            "model_version": "v1.0.0",
            "symbol": symbol,
            "features_summary": features_summary or {}
        }
        
        response = requests.post(
            f"{self.base_url}/vision-agent-signal",
            headers=self.headers,
            json=payload
        )
        
        if response.status_code == 200:
            print(f"✓ Signal sent: {action} @ {confidence:.2%}")
            return response.json()
        else:
            print(f"✗ Signal failed: {response.text}")
            return None
    
    def update_status(self, status, current_video_id=None, current_video_title=None, 
                     current_frame=None, total_frames=None, progress_percent=None):
        """Send heartbeat and update agent status"""
        payload = {
            "status": status,
            "current_video_id": current_video_id,
            "current_video_title": current_video_title,
            "current_frame": current_frame,
            "total_frames": total_frames,
            "progress_percent": progress_percent
        }
        
        response = requests.post(
            f"{self.base_url}/vision-agent-status",
            headers=self.headers,
            json=payload
        )
        
        return response.status_code == 200
    
    def register_video(self, video_id, video_title, video_url, channel_name, duration_seconds, total_frames):
        """Register new video for processing"""
        payload = {
            "video_id": video_id,
            "video_title": video_title,
            "video_url": video_url,
            "channel_name": channel_name,
            "duration_seconds": duration_seconds,
            "total_frames": total_frames
        }
        
        response = requests.post(
            f"{self.base_url}/vision-agent-video",
            headers=self.headers,
            json=payload
        )
        
        return response.status_code == 200
    
    def update_video_progress(self, video_id, frames_processed, signals_detected, status="PROCESSING"):
        """Update video processing progress"""
        payload = {
            "video_id": video_id,
            "frames_processed": frames_processed,
            "signals_detected": signals_detected,
            "status": status
        }
        
        response = requests.put(
            f"{self.base_url}/vision-agent-video",
            headers=self.headers,
            json=payload
        )
        
        return response.status_code == 200
```

## 5. Main Agent Loop

```python
import time

class VisionTradingAgent:
    def __init__(self, config):
        self.config = config
        self.video_processor = VideoProcessor(config)
        self.feature_extractor = FeatureExtractor()
        self.model = SignalModel(seq_len=config.SEQ_LEN)
        self.supabase = SupabaseClient(config)
        
        # Load trained model
        # self.model.load_model("models/model_seq_v20251125.h5")
    
    def process_video(self, video_url):
        """Process a single video"""
        print(f"\n📹 Downloading video: {video_url}")
        
        # Download video
        video_info = self.video_processor.download_video(video_url)
        
        # Register video in Supabase
        self.supabase.register_video(
            video_id=video_info['video_id'],
            video_title=video_info['title'],
            video_url=video_info['url'],
            channel_name=self.config.CHANNEL_NAME,
            duration_seconds=video_info['duration'],
            total_frames=0  # Will update after extraction
        )
        
        # Extract frames
        print(f"🎬 Extracting frames...")
        frames, total_frames = self.video_processor.extract_frames(
            video_info['path'],
            frame_step=self.config.FRAME_STEP
        )
        
        print(f"✓ Extracted {len(frames)} frames from {total_frames} total")
        
        # Update video with total frames
        self.supabase.update_video_progress(
            video_id=video_info['video_id'],
            frames_processed=0,
            signals_detected=0,
            status="PROCESSING"
        )
        
        # Process frames in sequences
        signals_detected = 0
        feature_buffer = []
        
        for frame_idx, frame in enumerate(frames):
            # Extract features
            features = self.feature_extractor.extract_features(frame)
            feature_vector = self.feature_extractor.create_feature_vector(features)
            feature_buffer.append(feature_vector)
            
            # When we have enough frames for a sequence
            if len(feature_buffer) >= self.config.SEQ_LEN:
                sequence = np.array(feature_buffer[-self.config.SEQ_LEN:])
                
                # Predict action
                action, confidence = self.model.predict(sequence)
                
                # Send signal if confidence is above threshold
                if confidence >= self.config.CONFIDENCE_THRESHOLD and action != "IGNORE":
                    self.supabase.send_signal(
                        video_id=video_info['video_id'],
                        frame_index=frame_idx * self.config.FRAME_STEP,
                        action=action,
                        confidence=confidence,
                        symbol=self.config.SYMBOL,
                        features_summary={
                            'lines_count': int(features['lines_count']),
                            'contains_numbers': features['contains_numbers'],
                            'red_intensity': float(features['red_intensity']),
                            'green_intensity': float(features['green_intensity'])
                        }
                    )
                    signals_detected += 1
            
            # Update progress every 50 frames
            if frame_idx % 50 == 0:
                progress = (frame_idx / len(frames)) * 100
                self.supabase.update_status(
                    status="PROCESSING",
                    current_video_id=video_info['video_id'],
                    current_video_title=video_info['title'],
                    current_frame=frame_idx * self.config.FRAME_STEP,
                    total_frames=total_frames,
                    progress_percent=progress
                )
                self.supabase.update_video_progress(
                    video_id=video_info['video_id'],
                    frames_processed=frame_idx,
                    signals_detected=signals_detected
                )
        
        # Mark video as completed
        self.supabase.update_video_progress(
            video_id=video_info['video_id'],
            frames_processed=len(frames),
            signals_detected=signals_detected,
            status="COMPLETED"
        )
        
        print(f"✓ Video processed: {signals_detected} signals detected")
    
    def run(self):
        """Main agent loop"""
        print("🚀 Vision Trading Agent Starting...")
        
        # Get playlist videos
        playlist = Playlist(self.config.PLAYLIST_URL)
        video_urls = list(playlist.video_urls)
        
        print(f"📋 Found {len(video_urls)} videos in playlist")
        
        # Process each video
        for idx, video_url in enumerate(video_urls):
            print(f"\n[{idx+1}/{len(video_urls)}] Processing video...")
            try:
                self.process_video(video_url)
            except Exception as e:
                print(f"✗ Error processing video: {e}")
                continue
        
        print("\n✓ All videos processed!")

# Run the agent
if __name__ == "__main__":
    config = AgentConfig()
    agent = VisionTradingAgent(config)
    agent.run()
```

## Getting Your JWT Token

To get your user JWT token for authentication:

1. Log in to the platform at the dashboard
2. Open browser DevTools (F12)
3. Go to Application → Local Storage → `https://your-domain.com`
4. Find the key starting with `sb-` and containing `auth-token`
5. Copy the `access_token` value
6. Use this token in `AgentConfig.USER_JWT_TOKEN`

## Next Steps

1. **Train the Model**: Collect labeled training data from videos and train the LSTM model
2. **Deploy Agent**: Run the Python agent on a server or cloud platform
3. **Monitor Performance**: Use the Vision Agent dashboard to monitor signals and performance
4. **Iterate**: Continuously improve the model with new training data

## Notes

- The agent runs EXTERNALLY and communicates with Supabase
- Start with SHADOW mode to collect data without executing trades
- Use PAPER mode to test with simulated trading
- Only use LIVE mode after thorough validation
- The model requires training data - start by manually labeling video sequences
