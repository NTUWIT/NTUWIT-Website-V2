// Array & String, Hashing. Python sources; `partial` passes some tests, `correct` all.
import type { Solutions } from "./types";

export const PART1: Solutions = {
  max_area: {
    partial: `
def max_area(heights):
    # Partial: only compares walls standing next to each other.
    return max(min(a, b) for a, b in zip(heights, heights[1:]))
`,
    correct: `
def max_area(heights):
    left, right, best = 0, len(heights) - 1, 0
    while left < right:
        best = max(best, min(heights[left], heights[right]) * (right - left))
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1
    return best
`,
  },
  move_zeros: {
    partial: `
def move_zeros(nums):
    # Partial: moves the zeros but reverses everything else.
    return [x for x in nums if x != 0][::-1] + [0] * nums.count(0)
`,
    correct: `
def move_zeros(nums):
    write = 0
    for x in nums:
        if x != 0:
            nums[write] = x
            write += 1
    for i in range(write, len(nums)):
        nums[i] = 0
    return nums
`,
  },
  max_window_sum: {
    partial: `
def max_window_sum(nums, size):
    # Partial: off by one, so the last window is never checked.
    return max(sum(nums[i:i + size]) for i in range(len(nums) - size))
`,
    correct: `
def max_window_sum(nums, size):
    window = sum(nums[:size])
    best = window
    for i in range(size, len(nums)):
        window += nums[i] - nums[i - size]
        best = max(best, window)
    return best
`,
  },
  shortest_subarray: {
    partial: `
def shortest_subarray(target, nums):
    # Partial: looks for a total of exactly target, not at least target.
    best = 0
    for i in range(len(nums)):
        total = 0
        for j in range(i, len(nums)):
            total += nums[j]
            if total == target and (best == 0 or j - i + 1 < best):
                best = j - i + 1
    return best
`,
    correct: `
def shortest_subarray(target, nums):
    left = total = 0
    best = float("inf")
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else best
`,
  },
  range_sums: {
    partial: `
def range_sums(nums, queries):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    # Partial: treats the right end as excluded.
    return [prefix[r] - prefix[l] for l, r in queries]
`,
    correct: `
def range_sums(nums, queries):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    return [prefix[r + 1] - prefix[l] for l, r in queries]
`,
  },
  apply_increments: {
    partial: `
def apply_increments(length, updates):
    diff = [0] * (length + 1)
    for start, end, amount in updates:
        diff[start] += amount
        diff[end] -= amount  # Partial: should be end + 1, so the end is left out.
    out, running = [], 0
    for i in range(length):
        running += diff[i]
        out.append(running)
    return out
`,
    correct: `
def apply_increments(length, updates):
    diff = [0] * (length + 1)
    for start, end, amount in updates:
        diff[start] += amount
        diff[end + 1] -= amount
    out, running = [], 0
    for i in range(length):
        running += diff[i]
        out.append(running)
    return out
`,
  },
  best_run: {
    partial: `
def best_run(nums):
    # Partial: starting from 0 means an all-negative list reports 0.
    current = best = 0
    for x in nums:
        current = max(0, current + x)
        best = max(best, current)
    return best
`,
    correct: `
def best_run(nums):
    current = best = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best
`,
  },
  merge_intervals: {
    partial: `
def merge_intervals(intervals):
    out = []
    for start, end in sorted(intervals):
        if out and start < out[-1][1]:  # Partial: touching intervals are not merged.
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out
`,
    correct: `
def merge_intervals(intervals):
    out = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out
`,
  },
  min_meeting_rooms: {
    partial: `
def min_meeting_rooms(meetings):
    starts = sorted(s for s, _ in meetings)
    ends = sorted(e for _, e in meetings)
    rooms = j = 0
    for s in starts:
        if s > ends[j]:  # Partial: a room freed at 10 is not reused at 10.
            j += 1
        else:
            rooms += 1
    return rooms
`,
    correct: `
def min_meeting_rooms(meetings):
    starts = sorted(s for s, _ in meetings)
    ends = sorted(e for _, e in meetings)
    rooms = j = 0
    for s in starts:
        if s >= ends[j]:
            j += 1
        else:
            rooms += 1
    return rooms
`,
  },
  sort_colors: {
    partial: `
def sort_colors(colors):
    # Partial: pulls the 0s to the front but never sorts 1s and 2s.
    return [c for c in colors if c == 0] + [c for c in colors if c != 0]
`,
    correct: `
def sort_colors(colors):
    low, mid, high = 0, 0, len(colors) - 1
    while mid <= high:
        if colors[mid] == 0:
            colors[low], colors[mid] = colors[mid], colors[low]
            low += 1
            mid += 1
        elif colors[mid] == 1:
            mid += 1
        else:
            colors[mid], colors[high] = colors[high], colors[mid]
            high -= 1
    return colors
`,
  },
  find_pattern: {
    partial: `
def find_pattern(text, pattern):
    # Partial: skips past each match, so overlapping matches are missed.
    out, i = [], text.find(pattern)
    while i != -1:
        out.append(i)
        i = text.find(pattern, i + len(pattern))
    return out
`,
    correct: `
def find_pattern(text, pattern):
    # KMP: fail[i] is the longest proper prefix of pattern[:i+1] that is also a suffix.
    fail, k = [0] * len(pattern), 0
    for i in range(1, len(pattern)):
        while k and pattern[i] != pattern[k]:
            k = fail[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        fail[i] = k
    out, k = [], 0
    for i, ch in enumerate(text):
        while k and ch != pattern[k]:
            k = fail[k - 1]
        if ch == pattern[k]:
            k += 1
        if k == len(pattern):
            out.append(i - k + 1)
            k = fail[k - 1]
    return out
`,
  },
  longest_palindrome: {
    partial: `
def longest_palindrome(text):
    # Partial: only expands around single characters, so even-length palindromes are missed.
    best = ""
    for centre in range(len(text)):
        lo = hi = centre
        while lo >= 0 and hi < len(text) and text[lo] == text[hi]:
            lo -= 1
            hi += 1
        if hi - lo - 1 > len(best):
            best = text[lo + 1:hi]
    return best
`,
    correct: `
def longest_palindrome(text):
    best = ""
    for centre in range(len(text)):
        for lo, hi in ((centre, centre), (centre, centre + 1)):
            while lo >= 0 and hi < len(text) and text[lo] == text[hi]:
                lo -= 1
                hi += 1
            if hi - lo - 1 > len(best):
                best = text[lo + 1:hi]
    return best
`,
  },
  longest_buildable_palindrome: {
    partial: `
from collections import Counter

def longest_buildable_palindrome(letters):
    # Partial: forgets that one odd letter can sit in the middle.
    return sum(c // 2 * 2 for c in Counter(letters).values())
`,
    correct: `
from collections import Counter

def longest_buildable_palindrome(letters):
    counts = Counter(letters).values()
    pairs = sum(c // 2 * 2 for c in counts)
    return pairs + (1 if any(c % 2 for c in counts) else 0)
`,
  },
  first_unique_char: {
    partial: `
def first_unique_char(text):
    # Partial: only checks later characters, not earlier ones.
    for i, ch in enumerate(text):
        if ch not in text[i + 1:]:
            return i
    return -1
`,
    correct: `
from collections import Counter

def first_unique_char(text):
    counts = Counter(text)
    for i, ch in enumerate(text):
        if counts[ch] == 1:
            return i
    return -1
`,
  },
  longest_consecutive: {
    partial: `
def longest_consecutive(nums):
    # Partial: a repeated number breaks the run instead of being skipped.
    if not nums:
        return 0
    nums = sorted(nums)
    best = run = 1
    for a, b in zip(nums, nums[1:]):
        run = run + 1 if b == a + 1 else 1
        best = max(best, run)
    return best
`,
    correct: `
def longest_consecutive(nums):
    present, best = set(nums), 0
    for x in present:
        if x - 1 not in present:
            y = x
            while y + 1 in present:
                y += 1
            best = max(best, y - x + 1)
    return best
`,
  },
  two_sum: {
    partial: `
def two_sum(nums, target):
    # Partial: two pointers need a sorted list, and sorting loses the positions.
    s = sorted(nums)
    left, right = 0, len(s) - 1
    while left < right:
        total = s[left] + s[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1
        else:
            right -= 1
    return []
`,
    correct: `
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
`,
  },
  three_sum: {
    partial: `
def three_sum(nums):
    # Partial: never removes duplicate triplets.
    out = []
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            for k in range(j + 1, len(nums)):
                if nums[i] + nums[j] + nums[k] == 0:
                    out.append(sorted([nums[i], nums[j], nums[k]]))
    return out
`,
    correct: `
def three_sum(nums):
    nums, out = sorted(nums), []
    for i in range(len(nums)):
        if i and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                out.append([nums[i], nums[left], nums[right]])
                left += 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
                right -= 1
    return out
`,
  },
  group_anagrams: {
    partial: `
def group_anagrams(words):
    # Partial: groups by length instead of by letters.
    groups = {}
    for w in words:
        groups.setdefault(len(w), []).append(w)
    return list(groups.values())
`,
    correct: `
def group_anagrams(words):
    groups = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return list(groups.values())
`,
  },
};
