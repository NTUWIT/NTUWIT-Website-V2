// Dynamic Programming, Greedy.
import type { Solutions } from "./types";

export const PART4: Solutions = {
  house_robber: {
    partial: `
def house_robber(houses):
    # Partial: every other house from one end is not always best.
    return max(sum(houses[0::2]), sum(houses[1::2]))
`,
    correct: `
def house_robber(houses):
    take = skip = 0
    for x in houses:
        take, skip = skip + x, max(take, skip)
    return max(take, skip)
`,
  },
  unique_paths: {
    partial: `
def unique_paths(rows, cols):
    # Partial: counts cells, not paths.
    return rows * cols
`,
    correct: `
from math import comb

def unique_paths(rows, cols):
    return comb(rows + cols - 2, rows - 1)
`,
  },
  edit_distance: {
    partial: `
def edit_distance(source, target):
    # Partial: compares position by position, so an insertion shifts everything.
    return sum(a != b for a, b in zip(source, target)) + abs(len(source) - len(target))
`,
    correct: `
def edit_distance(source, target):
    prev = list(range(len(target) + 1))
    for i, a in enumerate(source, 1):
        cur = [i]
        for j, b in enumerate(target, 1):
            cur.append(prev[j - 1] if a == b else 1 + min(prev[j], cur[j - 1], prev[j - 1]))
        prev = cur
    return prev[-1]
`,
  },
  knapsack: {
    partial: `
def knapsack(weights, values, capacity):
    # Partial: greedy by value per weight, which fails when items do not fit exactly.
    total = 0
    for w, v in sorted(zip(weights, values), key=lambda p: p[1] / p[0], reverse=True):
        if w <= capacity:
            capacity -= w
            total += v
    return total
`,
    correct: `
def knapsack(weights, values, capacity):
    best = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):
            best[c] = max(best[c], best[c - w] + v)
    return best[capacity]
`,
  },
  coin_change: {
    partial: `
def coin_change(coins, amount):
    # Partial: always takes the biggest coin first.
    count = 0
    for c in sorted(coins, reverse=True):
        count += amount // c
        amount %= c
    return count if amount == 0 else -1
`,
    correct: `
def coin_change(coins, amount):
    INF = amount + 1
    best = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1
    return best[amount] if best[amount] < INF else -1
`,
  },
  fractional_knapsack: {
    partial: `
def fractional_knapsack(weights, values, capacity):
    # Partial: fills by value, not by value per weight.
    total = 0.0
    for w, v in sorted(zip(weights, values), key=lambda p: p[1], reverse=True):
        take = min(w, capacity)
        total += v * take / w
        capacity -= take
    return total
`,
    correct: `
def fractional_knapsack(weights, values, capacity):
    total = 0.0
    for w, v in sorted(zip(weights, values), key=lambda p: p[1] / p[0], reverse=True):
        take = min(w, capacity)
        total += v * take / w
        capacity -= take
    return total
`,
  },
  lcs: {
    partial: `
from collections import Counter

def lcs(first, second):
    # Partial: counts shared letters and ignores their order.
    return sum((Counter(first) & Counter(second)).values())
`,
    correct: `
def lcs(first, second):
    prev = [0] * (len(second) + 1)
    for a in first:
        cur = [0]
        for j, b in enumerate(second, 1):
            cur.append(prev[j - 1] + 1 if a == b else max(prev[j], cur[j - 1]))
        prev = cur
    return prev[-1]
`,
  },
  lis: {
    partial: `
from bisect import bisect_right

def lis(nums):
    # Partial: bisect_right lets equal numbers count as increasing.
    tails = []
    for x in nums:
        i = bisect_right(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
`,
    correct: `
from bisect import bisect_left

def lis(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
`,
  },
  matrix_chain: {
    partial: `
def matrix_chain(dims):
    # Partial: multiplies strictly left to right.
    return sum(dims[0] * dims[k] * dims[k + 1] for k in range(1, len(dims) - 1))
`,
    correct: `
def matrix_chain(dims):
    n = len(dims) - 1
    cost = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            cost[i][j] = min(
                cost[i][k] + cost[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                for k in range(i, j)
            )
    return cost[0][n - 1]
`,
  },
  stock_cooldown: {
    partial: `
def stock_cooldown(prices):
    # Partial: takes every rise and ignores the rest day.
    return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))
`,
    correct: `
def stock_cooldown(prices):
    hold, sold, rest = float("-inf"), 0, 0
    for p in prices:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)
`,
  },
  shortest_tour: {
    partial: `
def shortest_tour(dist):
    n, INF = len(dist), float("inf")
    full = 1 << n
    dp = [[INF] * n for _ in range(full)]
    dp[1][0] = 0
    for mask in range(full):
        for u in range(n):
            if dp[mask][u] == INF:
                continue
            for v in range(n):
                if not mask >> v & 1:
                    nxt = mask | 1 << v
                    dp[nxt][v] = min(dp[nxt][v], dp[mask][u] + dist[u][v])
    return min(dp[full - 1])  # Partial: forgets the trip back to city 0.
`,
    correct: `
def shortest_tour(dist):
    n, INF = len(dist), float("inf")
    full = 1 << n
    dp = [[INF] * n for _ in range(full)]
    dp[1][0] = 0
    for mask in range(full):
        for u in range(n):
            if dp[mask][u] == INF:
                continue
            for v in range(n):
                if not mask >> v & 1:
                    nxt = mask | 1 << v
                    dp[nxt][v] = min(dp[nxt][v], dp[mask][u] + dist[u][v])
    return min(dp[full - 1][u] + dist[u][0] for u in range(n))
`,
  },
  count_distinct_digit_numbers: {
    partial: `
def count_distinct_digit_numbers(n):
    # Partial: checks every number, which is right but far too slow for large n.
    return sum(1 for x in range(1, n + 1) if len(set(str(x))) == len(str(x)))
`,
    correct: `
def count_distinct_digit_numbers(n):
    digits = list(map(int, str(n)))
    length = len(digits)
    def arrange(available, slots):
        ways = 1
        for i in range(slots):
            ways *= available - i
        return ways
    # Every shorter number: first digit 1-9, the rest from what is left.
    count = sum(9 * arrange(9, size - 1) for size in range(1, length))
    used = set()
    for i, d in enumerate(digits):
        for x in range(1 if i == 0 else 0, d):
            if x not in used:
                count += arrange(10 - i - 1, length - i - 1)
        if d in used:
            return count
        used.add(d)
    return count + 1
`,
  },
  max_path_sum: {
    partial: `
def max_path_sum(root):
    # Partial: only paths that start at the root and go down.
    def down(n):
        if not n:
            return 0
        return n.val + max(0, down(n.left), down(n.right))
    return down(root)
`,
    correct: `
def max_path_sum(root):
    best = float("-inf")
    def gain(n):
        nonlocal best
        if not n:
            return 0
        left, right = max(0, gain(n.left)), max(0, gain(n.right))
        best = max(best, n.val + left + right)
        return n.val + max(left, right)
    gain(root)
    return best
`,
  },
  count_dag_paths: {
    partial: `
def count_dag_paths(nodes, edges):
    # Partial: counts the edges into the last node, not whole routes.
    return sum(1 for a, b in edges if b == nodes - 1)
`,
    correct: `
from functools import lru_cache

def count_dag_paths(nodes, edges):
    out = [[] for _ in range(nodes)]
    for a, b in edges:
        out[a].append(b)
    @lru_cache(None)
    def ways(u):
        return 1 if u == nodes - 1 else sum(ways(v) for v in out[u])
    return ways(0)
`,
  },
  min_removals: {
    partial: `
def min_removals(intervals):
    # Partial: counts overlapping pairs rather than intervals to remove.
    n = len(intervals)
    return sum(
        1
        for i in range(n)
        for j in range(i + 1, n)
        if intervals[i][0] < intervals[j][1] and intervals[j][0] < intervals[i][1]
    )
`,
    correct: `
def min_removals(intervals):
    end, kept = float("-inf"), 0
    for start, finish in sorted(intervals, key=lambda iv: iv[1]):
        if start >= end:
            kept += 1
            end = finish
    return len(intervals) - kept
`,
  },
  max_activities: {
    partial: `
def max_activities(starts, ends):
    # Partial: picks by earliest start instead of earliest end.
    end, count = float("-inf"), 0
    for s, e in sorted(zip(starts, ends)):
        if s >= end:
            count += 1
            end = e
    return count
`,
    correct: `
def max_activities(starts, ends):
    end, count = float("-inf"), 0
    for s, e in sorted(zip(starts, ends), key=lambda p: p[1]):
        if s >= end:
            count += 1
            end = e
    return count
`,
  },
  min_jumps: {
    partial: `
def min_jumps(jumps):
    # Partial: always takes the longest jump available.
    i = count = 0
    while i < len(jumps) - 1:
        i += max(jumps[i], 1)
        count += 1
    return count
`,
    correct: `
def min_jumps(jumps):
    count = reach = edge = 0
    for i in range(len(jumps) - 1):
        reach = max(reach, i + jumps[i])
        if i == edge:
            count += 1
            edge = reach
    return count
`,
  },
  huffman_cost: {
    partial: `
def huffman_cost(weights):
    # Partial: merges from left to right instead of always the two smallest.
    cost, pile = 0, weights[0]
    for w in weights[1:]:
        pile += w
        cost += pile
    return cost
`,
    correct: `
import heapq

def huffman_cost(weights):
    heapq.heapify(weights)
    cost = 0
    while len(weights) > 1:
        merged = heapq.heappop(weights) + heapq.heappop(weights)
        cost += merged
        heapq.heappush(weights, merged)
    return cost
`,
  },
};
