import sys
import os
sys.path.append(os.path.abspath('backend'))
from embeddings import embed
import numpy as np

texts = [
    "How to track my order?",
    "How to track my order?",
    "Where is my package?",
    "I need help tracking the shipment for my account."
]

vecs = embed(texts)
print("\nExact Match Similarity:")
score1 = np.dot(vecs[0], vecs[1])
print(f"Index 0 vs 1: {score1:.4f}")

print("\nSimilar Match:")
score2 = np.dot(vecs[0], vecs[2])
print(f"Index 0 vs 2: {score2:.4f}")

print("\nVague Match:")
score3 = np.dot(vecs[0], vecs[3])
print(f"Index 0 vs 3: {score3:.4f}")
