import os
import time
import random

base_dir = "notes"
folders = ["old", "new", "short", "long", "linked", "orphan"]

# Create notes in various categories
# 1. New notes (last 30 days)
for i in range(20):
    with open(f"{base_dir}/new/note_{i}.md", "w") as f:
        f.write("This is a new note.")

# 2. Old notes (6-12 months ago)
for i in range(20):
    with open(f"{base_dir}/old/note_{i}.md", "w") as func_text):
        func_text.write("This is an old note.")

# 3. Very old notes (>1 year ago)
for i in range(20):
    with open(f"{base_dir}/old/very_old_{i}.md", "w") as f:
        f.write("This is a very old note.")

# 4. Short notes
for i in range(10):
    with open(f"{base_dir}/short/note_{i}.md", "w") as f:
        f.write("Short.")

# 5. Long notes
for i in range(10):
    with open(f"{base_dir}/long/note_{i}.md", "w") as f:
        f.write("This is a very long note. " * 50)

# 6. Linked/Orphan notes
for i in range(10):
    with open(f"{base_dir}/linked/note_{i}.md", "w") as f:
        f.write("Linked note content.")
for i in range(10):
    with open(f"{base_dir}/orphan/note_{i}.md", "w") as f:
        f.write("Orphaned note content.")

print("Generated 100 notes for testing.")
