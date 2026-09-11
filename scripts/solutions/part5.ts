// Heap / Priority Queue, Bit Manipulation, Math & Geometry, Design, Advanced.
import type { Solutions } from "./types";

export const PART5: Solutions = {
  k_closest: {
    partial: `
def k_closest(points, k):
    # Partial: Manhattan distance ranks points differently from straight-line distance.
    return sorted(points, key=lambda p: abs(p[0]) + abs(p[1]))[:k]
`,
    correct: `
import heapq

def k_closest(points, k):
    return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])
`,
  },
  merge_k_sorted: {
    partial: `
def merge_k_sorted(lists):
    # Partial: only merges the first two lists.
    if len(lists) < 2:
        return lists[0] if lists else []
    return sorted(lists[0] + lists[1])
`,
    correct: `
import heapq

def merge_k_sorted(lists):
    return list(heapq.merge(*lists))
`,
  },
  top_k_frequent: {
    partial: `
def top_k_frequent(nums, k):
    # Partial: returns the k biggest numbers, not the k most common.
    return sorted(set(nums), reverse=True)[:k]
`,
    correct: `
from collections import Counter

def top_k_frequent(nums, k):
    return [x for x, _ in Counter(nums).most_common(k)]
`,
  },
  running_median: {
    partial: `
def running_median(nums):
    # Partial: takes the lower middle instead of averaging the two middles.
    return [float(sorted(nums[:i + 1])[i // 2]) for i in range(len(nums))]
`,
    correct: `
import heapq

def running_median(nums):
    low, high, out = [], [], []  # low is a max-heap stored negated
    for x in nums:
        heapq.heappush(low, -x)
        heapq.heappush(high, -heapq.heappop(low))
        if len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))
        out.append(float(-low[0]) if len(low) > len(high) else (-low[0] + high[0]) / 2)
    return out
`,
  },
  two_singles: {
    partial: `
def two_singles(nums):
    xor = 0
    for v in nums:
        xor ^= v
    # Partial: splits by the lowest bit, which fails when both are odd or both even.
    a = 0
    for v in nums:
        if v & 1:
            a ^= v
    return [a, xor ^ a]
`,
    correct: `
def two_singles(nums):
    xor = 0
    for v in nums:
        xor ^= v
    bit = xor & -xor  # a bit where the two lonely numbers differ
    a = 0
    for v in nums:
        if v & bit:
            a ^= v
    return [a, xor ^ a]
`,
  },
  count_bits: {
    partial: `
def count_bits(n):
    # Partial: only counts the two lowest bits.
    return [i % 2 + i // 2 % 2 for i in range(n + 1)]
`,
    correct: `
def count_bits(n):
    out = [0] * (n + 1)
    for i in range(1, n + 1):
        out[i] = out[i >> 1] + (i & 1)
    return out
`,
  },
  max_word_product: {
    partial: `
def max_word_product(words):
    # Partial: only checks that the first letters differ.
    best = 0
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            if words[i][0] != words[j][0]:
                best = max(best, len(words[i]) * len(words[j]))
    return best
`,
    correct: `
def max_word_product(words):
    masks = [sum(1 << (ord(c) - 97) for c in set(w)) for w in words]
    best = 0
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            if masks[i] & masks[j] == 0:
                best = max(best, len(words[i]) * len(words[j]))
    return best
`,
  },
  lcm_of_all: {
    partial: `
def lcm_of_all(periods):
    # Partial: the product is a common multiple, but not always the least one.
    out = 1
    for p in periods:
        out *= p
    return out
`,
    correct: `
from math import gcd

def lcm_of_all(periods):
    out = 1
    for p in periods:
        out = out // gcd(out, p) * p
    return out
`,
  },
  count_primes: {
    partial: `
def count_primes(n):
    # Partial: trial division is right but too slow for n in the millions.
    def prime(x):
        if x < 2:
            return False
        i = 2
        while i * i <= x:
            if x % i == 0:
                return False
            i += 1
        return True
    return sum(1 for x in range(n) if prime(x))
`,
    correct: `
def count_primes(n):
    if n < 3:
        return 0
    sieve = bytearray([1]) * n
    sieve[0] = sieve[1] = 0
    for i in range(2, int(n ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(range(i * i, n, i)))
    return sum(sieve)
`,
  },
  power_mod: {
    partial: `
def power_mod(base, exponent, modulus):
    # Partial: multiplies one step at a time, far too slow for a huge exponent.
    result = 1 % modulus
    for _ in range(exponent):
        result = result * base % modulus
    return result
`,
    correct: `
def power_mod(base, exponent, modulus):
    result, base = 1 % modulus, base % modulus
    while exponent:
        if exponent & 1:
            result = result * base % modulus
        base = base * base % modulus
        exponent >>= 1
    return result
`,
  },
  spiral_order: {
    partial: `
def spiral_order(grid):
    out = []
    top, bottom, left, right = 0, len(grid) - 1, 0, len(grid[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            out.append(grid[top][j])
        top += 1
        for i in range(top, bottom + 1):
            out.append(grid[i][right])
        right -= 1
        # Partial: no re-check here, so thin grids are read twice.
        for j in range(right, left - 1, -1):
            out.append(grid[bottom][j])
        bottom -= 1
        for i in range(bottom, top - 1, -1):
            out.append(grid[i][left])
        left += 1
    return out
`,
    correct: `
def spiral_order(grid):
    out = []
    top, bottom, left, right = 0, len(grid) - 1, 0, len(grid[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            out.append(grid[top][j])
        top += 1
        for i in range(top, bottom + 1):
            out.append(grid[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                out.append(grid[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                out.append(grid[i][left])
            left += 1
    return out
`,
  },
  rotate_grid: {
    partial: `
def rotate_grid(grid):
    # Partial: transposes but forgets to reverse each row.
    return [list(row) for row in zip(*grid)]
`,
    correct: `
def rotate_grid(grid):
    return [list(row) for row in zip(*grid[::-1])]
`,
  },
  skyline: {
    partial: `
import heapq

def skyline(buildings):
    xs = sorted({x for l, r, h in buildings for x in (l, r)})
    out, heap, i, ordered = [], [], 0, sorted(buildings)
    for x in xs:
        while i < len(ordered) and ordered[i][0] <= x:
            heapq.heappush(heap, (-ordered[i][2], ordered[i][1]))
            i += 1
        while heap and heap[0][1] <= x:
            heapq.heappop(heap)
        # Partial: emits a point at every edge, even when the height is unchanged.
        out.append([x, -heap[0][0] if heap else 0])
    return out
`,
    correct: `
import heapq

def skyline(buildings):
    xs = sorted({x for l, r, h in buildings for x in (l, r)})
    out, heap, i, ordered, prev = [], [], 0, sorted(buildings), 0
    for x in xs:
        while i < len(ordered) and ordered[i][0] <= x:
            heapq.heappush(heap, (-ordered[i][2], ordered[i][1]))
            i += 1
        while heap and heap[0][1] <= x:
            heapq.heappop(heap)
        height = -heap[0][0] if heap else 0
        if height != prev:
            out.append([x, height])
            prev = height
    return out
`,
  },
  lru_cache: {
    partial: `
def lru_cache(capacity, ops, args):
    # Partial: evicts the oldest inserted key; a get does not count as a use.
    cache, out = {}, []
    for op, a in zip(ops, args):
        if op == "get":
            out.append(cache.get(a[0], -1))
        else:
            cache[a[0]] = a[1]
            if len(cache) > capacity:
                del cache[next(iter(cache))]
    return out
`,
    correct: `
from collections import OrderedDict

def lru_cache(capacity, ops, args):
    cache, out = OrderedDict(), []
    for op, a in zip(ops, args):
        if op == "get":
            if a[0] in cache:
                cache.move_to_end(a[0])
                out.append(cache[a[0]])
            else:
                out.append(-1)
        else:
            cache[a[0]] = a[1]
            cache.move_to_end(a[0])
            if len(cache) > capacity:
                cache.popitem(last=False)
    return out
`,
  },
  lfu_cache: {
    partial: `
def lfu_cache(capacity, ops, args):
    # Partial: no special case for a capacity of 0, so it crashes there.
    value, freq, last, out = {}, {}, {}, []
    for time, (op, a) in enumerate(zip(ops, args)):
        k = a[0]
        if op == "get":
            if k in value:
                freq[k] += 1
                last[k] = time
                out.append(value[k])
            else:
                out.append(-1)
            continue
        if k in value:
            value[k], freq[k], last[k] = a[1], freq[k] + 1, time
            continue
        if len(value) >= capacity:
            victim = min(value, key=lambda x: (freq[x], last[x]))
            del value[victim], freq[victim], last[victim]
        value[k], freq[k], last[k] = a[1], 1, time
    return out
`,
    correct: `
def lfu_cache(capacity, ops, args):
    value, freq, last, out = {}, {}, {}, []
    for time, (op, a) in enumerate(zip(ops, args)):
        k = a[0]
        if op == "get":
            if k in value:
                freq[k] += 1
                last[k] = time
                out.append(value[k])
            else:
                out.append(-1)
            continue
        if capacity == 0:
            continue
        if k in value:
            value[k], freq[k], last[k] = a[1], freq[k] + 1, time
            continue
        if len(value) >= capacity:
            # Fewest uses first, then least recently used among those.
            victim = min(value, key=lambda x: (freq[x], last[x]))
            del value[victim], freq[victim], last[victim]
        value[k], freq[k], last[k] = a[1], 1, time
    return out
`,
  },
  twitter: {
    partial: `
def twitter(ops, args):
    # Partial: the feed shows only the user's own tweets.
    tweets, out, time = {}, [], 0
    for op, a in zip(ops, args):
        if op == "post":
            time += 1
            tweets.setdefault(a[0], []).append((time, a[1]))
        elif op == "feed":
            recent = sorted(tweets.get(a[0], []), reverse=True)[:10]
            out.append([tid for _, tid in recent])
    return out
`,
    correct: `
import heapq

def twitter(ops, args):
    tweets, follows, out, time = {}, {}, [], 0
    for op, a in zip(ops, args):
        if op == "post":
            time += 1
            tweets.setdefault(a[0], []).append((time, a[1]))
        elif op == "follow":
            if a[0] != a[1]:
                follows.setdefault(a[0], set()).add(a[1])
        elif op == "unfollow":
            follows.get(a[0], set()).discard(a[1])
        else:
            people = {a[0]} | follows.get(a[0], set())
            recent = heapq.nlargest(10, (t for p in people for t in tweets.get(p, [])))
            out.append([tid for _, tid in recent])
    return out
`,
  },
  should_print: {
    wrong: `
def should_print(timestamps, messages):
    # Totally incorrect: never prints anything, and reports one answer too many.
    return [False] * (len(timestamps) + 1)
`,
    partial: `
def should_print(timestamps, messages):
    last, out = {}, []
    for t, m in zip(timestamps, messages):
        if m in last and t <= last[m] + 10:  # Partial: blocks exactly 10 seconds later too.
            out.append(False)
        else:
            last[m] = t
            out.append(True)
    return out
`,
    correct: `
def should_print(timestamps, messages):
    last, out = {}, []
    for t, m in zip(timestamps, messages):
        if m in last and t < last[m] + 10:
            out.append(False)
        else:
            last[m] = t
            out.append(True)
    return out
`,
  },
  bst_iterator: {
    partial: `
def bst_iterator(root, ops):
    # Partial: walks in preorder, not increasing order.
    values = []
    def walk(n):
        if n:
            values.append(n.val)
            walk(n.left)
            walk(n.right)
    walk(root)
    out, i = [], 0
    for op in ops:
        if op == "next":
            out.append(values[i])
            i += 1
        else:
            out.append(1 if i < len(values) else 0)
    return out
`,
    correct: `
def bst_iterator(root, ops):
    stack, out = [], []
    def push_left(n):
        while n:
            stack.append(n)
            n = n.left
    push_left(root)
    for op in ops:
        if op == "next":
            n = stack.pop()
            out.append(n.val)
            push_left(n.right)
        else:
            out.append(1 if stack else 0)
    return out
`,
  },
  min_network_cost: {
    partial: `
def min_network_cost(nodes, links):
    parent = list(range(nodes))
    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x
    cost = 0
    for a, b, w in sorted(links, key=lambda l: l[2]):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            cost += w
    return cost  # Partial: never checks that every node was connected.
`,
    correct: `
def min_network_cost(nodes, links):
    parent = list(range(nodes))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    cost = used = 0
    for a, b, w in sorted(links, key=lambda l: l[2]):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            cost += w
            used += 1
    return cost if used == nodes - 1 else -1
`,
  },
  longest_increasing_path: {
    partial: `
from functools import lru_cache

def longest_increasing_path(grid):
    rows, cols = len(grid), len(grid[0])
    @lru_cache(None)
    def best(r, c):
        # Partial: only steps right or down.
        steps = [
            best(rr, cc)
            for rr, cc in ((r + 1, c), (r, c + 1))
            if rr < rows and cc < cols and grid[rr][cc] > grid[r][c]
        ]
        return 1 + max(steps, default=0)
    return max(best(r, c) for r in range(rows) for c in range(cols))
`,
    correct: `
from functools import lru_cache

def longest_increasing_path(grid):
    rows, cols = len(grid), len(grid[0])
    @lru_cache(None)
    def best(r, c):
        steps = [
            best(rr, cc)
            for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1))
            if 0 <= rr < rows and 0 <= cc < cols and grid[rr][cc] > grid[r][c]
        ]
        return 1 + max(steps, default=0)
    return max(best(r, c) for r in range(rows) for c in range(cols))
`,
  },
  split_array: {
    partial: `
def split_array(nums, parts):
    # Partial: the lower bound is not always reachable.
    return max(max(nums), -(-sum(nums) // parts))
`,
    correct: `
def split_array(nums, parts):
    def pieces(limit):
        count, total = 1, 0
        for x in nums:
            if total + x > limit:
                count += 1
                total = x
            else:
                total += x
        return count
    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if pieces(mid) <= parts:
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
  },
  min_window: {
    partial: `
from collections import Counter

def min_window(text, need):
    # Partial: treats need as a set, so repeated letters are only needed once.
    want = Counter(set(need))
    missing, left, best = len(want), 0, (float("inf"), 0, 0)
    for right, ch in enumerate(text):
        if want[ch] > 0:
            missing -= 1
        want[ch] -= 1
        while missing == 0:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right + 1)
            want[text[left]] += 1
            if want[text[left]] > 0:
                missing += 1
            left += 1
    return text[best[1]:best[2]] if best[0] != float("inf") else ""
`,
    correct: `
from collections import Counter

def min_window(text, need):
    want = Counter(need)
    missing, left, best = len(need), 0, (float("inf"), 0, 0)
    for right, ch in enumerate(text):
        if want[ch] > 0:
            missing -= 1
        want[ch] -= 1
        while missing == 0:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right + 1)
            want[text[left]] += 1
            if want[text[left]] > 0:
                missing += 1
            left += 1
    return text[best[1]:best[2]] if best[0] != float("inf") else ""
`,
  },
  sum_subarray_mins: {
    partial: `
def sum_subarray_mins(nums):
    # Partial: strict comparisons on both sides count equal minimums twice.
    MOD, n = 10 ** 9 + 7, len(nums)
    left, right, stack = [0] * n, [0] * n, []
    for i in range(n):
        while stack and nums[stack[-1]] > nums[i]:
            stack.pop()
        left[i] = i - (stack[-1] if stack else -1)
        stack.append(i)
    stack = []
    for i in range(n - 1, -1, -1):
        while stack and nums[stack[-1]] > nums[i]:
            stack.pop()
        right[i] = (stack[-1] if stack else n) - i
        stack.append(i)
    return sum(x * l * r for x, l, r in zip(nums, left, right)) % MOD
`,
    correct: `
def sum_subarray_mins(nums):
    MOD, n = 10 ** 9 + 7, len(nums)
    left, right, stack = [0] * n, [0] * n, []
    for i in range(n):
        while stack and nums[stack[-1]] > nums[i]:
            stack.pop()
        left[i] = i - (stack[-1] if stack else -1)
        stack.append(i)
    stack = []
    for i in range(n - 1, -1, -1):
        while stack and nums[stack[-1]] >= nums[i]:
            stack.pop()
        right[i] = (stack[-1] if stack else n) - i
        stack.append(i)
    return sum(x * l * r for x, l, r in zip(nums, left, right)) % MOD
`,
  },
};
