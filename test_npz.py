import numpy as np
import os

path = os.path.join('backend', 'data', 'faqs.npz')
if os.path.exists(path):
    data = np.load(path)
    vecs = data['vecs']
    zero_count = np.sum(np.all(vecs == 0, axis=1))
    print(f"Total vectors: {len(vecs)}")
    print(f"Zeroed vectors: {zero_count}")
else:
    print("No cache found")
