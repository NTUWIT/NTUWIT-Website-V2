// Graphs, Backtracking.
import type { Solutions } from "./types";

export const PART3: Solutions = {
  oranges_rotting: {
    partial: `
def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    rotten = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2]
    fresh, minutes = sum(row.count(1) for row in grid), 0
    while rotten and fresh:
        nxt = []
        for r, c in rotten:
            for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= rr < rows and 0 <= cc < cols and grid[rr][cc] == 1:
                    grid[rr][cc] = 2
                    fresh -= 1
                    nxt.append((rr, cc))
        rotten = nxt
        minutes += 1
    return minutes  # Partial: never reports -1 when fresh oranges are cut off.
`,
    correct: `
def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    rotten = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2]
    fresh, minutes = sum(row.count(1) for row in grid), 0
    while rotten and fresh:
        nxt = []
        for r, c in rotten:
            for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= rr < rows and 0 <= cc < cols and grid[rr][cc] == 1:
                    grid[rr][cc] = 2
                    fresh -= 1
                    nxt.append((rr, cc))
        rotten = nxt
        minutes += 1
    return -1 if fresh else minutes
`,
  },
  max_area_of_island: {
    partial: `
def max_area_of_island(grid):
    # Partial: counts the islands instead of measuring the biggest.
    rows, cols, count = len(grid), len(grid[0]), 0
    def sink(r, c):
        if 0 <= r < rows and 0 <= c < cols and grid[r][c] == 1:
            grid[r][c] = 0
            sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                count += 1
                sink(r, c)
    return count
`,
    correct: `
def max_area_of_island(grid):
    # A plain recursive DFS. On the 90 x 90 test it goes thousands of calls deep.
    rows, cols = len(grid), len(grid[0])
    def area(r, c):
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != 1:
            return 0
        grid[r][c] = 0
        return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1)
    return max((area(r, c) for r in range(rows) for c in range(cols)), default=0)
`,
  },
  clone_graph: {
    partial: `
def clone_graph(node):
    # Partial: only follows edges towards larger values, so part of the graph is lost.
    if node is None:
        return None
    copies = {node.val: Node(node.val)}
    stack = [node]
    while stack:
        cur = stack.pop()
        for nb in cur.neighbors:
            if nb.val < cur.val:
                continue
            if nb.val not in copies:
                copies[nb.val] = Node(nb.val)
                stack.append(nb)
            copies[cur.val].neighbors.append(copies[nb.val])
    return copies[node.val]
`,
    correct: `
def clone_graph(node):
    if node is None:
        return None
    copies = {node: Node(node.val)}
    queue = [node]
    for cur in queue:
        for nb in cur.neighbors:
            if nb not in copies:
                copies[nb] = Node(nb.val)
                queue.append(nb)
            copies[cur].neighbors.append(copies[nb])
    return copies[node]
`,
  },
  any_course_order: {
    partial: `
def any_course_order(courses, prereqs):
    # Partial: ignores the prerequisites and takes courses in number order.
    return list(range(courses))
`,
    correct: `
def any_course_order(courses, prereqs):
    # A stack rather than a queue, so the order usually differs from the stored
    # answer; the checker accepts any valid one.
    after, indegree = [[] for _ in range(courses)], [0] * courses
    for a, b in prereqs:
        after[b].append(a)
        indegree[a] += 1
    ready = [c for c in range(courses) if indegree[c] == 0]
    order = []
    while ready:
        c = ready.pop()
        order.append(c)
        for n in after[c]:
            indegree[n] -= 1
            if indegree[n] == 0:
                ready.append(n)
    return order if len(order) == courses else []
`,
  },
  redundant_connection: {
    partial: `
def redundant_connection(edges):
    # Partial: assumes the extra wire is always the last one listed.
    return edges[-1]
`,
    correct: `
def redundant_connection(edges):
    parent = list(range(len(edges) + 1))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return [a, b]
        parent[ra] = rb
    return []
`,
  },
  course_order: {
    partial: `
def course_order(courses, prereqs):
    # Partial: a DFS order is valid but not lowest-first, and loops go unnoticed.
    after = [[] for _ in range(courses)]
    for a, b in prereqs:
        after[b].append(a)
    seen, post = set(), []
    def dfs(c):
        seen.add(c)
        for n in after[c]:
            if n not in seen:
                dfs(n)
        post.append(c)
    for c in range(courses):
        if c not in seen:
            dfs(c)
    return post[::-1]
`,
    correct: `
import heapq

def course_order(courses, prereqs):
    after, indegree = [[] for _ in range(courses)], [0] * courses
    for a, b in prereqs:
        after[b].append(a)
        indegree[a] += 1
    ready = [c for c in range(courses) if indegree[c] == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        c = heapq.heappop(ready)
        order.append(c)
        for n in after[c]:
            indegree[n] -= 1
            if indegree[n] == 0:
                heapq.heappush(ready, n)
    return order if len(order) == courses else []
`,
  },
  network_delay: {
    partial: `
from collections import deque

def network_delay(times, nodes, start):
    # Partial: counts hops, which is only right when every link takes 1.
    graph = [[] for _ in range(nodes)]
    for u, v, w in times:
        graph[u].append(v)
    hops, queue = {start: 0}, deque([start])
    while queue:
        u = queue.popleft()
        for v in graph[u]:
            if v not in hops:
                hops[v] = hops[u] + 1
                queue.append(v)
    return max(hops.values()) if len(hops) == nodes else -1
`,
    correct: `
import heapq

def network_delay(times, nodes, start):
    graph = [[] for _ in range(nodes)]
    for u, v, w in times:
        graph[u].append((v, w))
    dist, heap = {}, [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue
        dist[u] = d
        for v, w in graph[u]:
            if v not in dist:
                heapq.heappush(heap, (d + w, v))
    return max(dist.values()) if len(dist) == nodes else -1
`,
  },
  cheapest_flight: {
    partial: `
def cheapest_flight(cities, flights, src, dst, max_stops):
    INF = float("inf")
    cost = [INF] * cities
    cost[src] = 0
    for _ in range(max_stops + 1):
        # Partial: relaxing in place lets one round chain several flights.
        for a, b, price in flights:
            if cost[a] + price < cost[b]:
                cost[b] = cost[a] + price
    return -1 if cost[dst] == INF else cost[dst]
`,
    correct: `
def cheapest_flight(cities, flights, src, dst, max_stops):
    INF = float("inf")
    cost = [INF] * cities
    cost[src] = 0
    for _ in range(max_stops + 1):
        nxt = cost[:]
        for a, b, price in flights:
            if cost[a] + price < nxt[b]:
                nxt[b] = cost[a] + price
        cost = nxt
    return -1 if cost[dst] == INF else cost[dst]
`,
  },
  city_fewest_neighbors: {
    partial: `
def city_fewest_neighbors(cities, roads, limit):
    # Partial: only direct roads count; no shortest paths through other cities.
    INF = float("inf")
    d = [[0 if i == j else INF for j in range(cities)] for i in range(cities)]
    for a, b, w in roads:
        d[a][b] = min(d[a][b], w)
        d[b][a] = min(d[b][a], w)
    best, best_count = -1, INF
    for i in range(cities):
        count = sum(1 for j in range(cities) if j != i and d[i][j] <= limit)
        if count <= best_count:
            best, best_count = i, count
    return best
`,
    correct: `
def city_fewest_neighbors(cities, roads, limit):
    INF = float("inf")
    d = [[0 if i == j else INF for j in range(cities)] for i in range(cities)]
    for a, b, w in roads:
        d[a][b] = min(d[a][b], w)
        d[b][a] = min(d[b][a], w)
    for k in range(cities):
        for i in range(cities):
            for j in range(cities):
                if d[i][k] + d[k][j] < d[i][j]:
                    d[i][j] = d[i][k] + d[k][j]
    best, best_count = -1, INF
    for i in range(cities):
        count = sum(1 for j in range(cities) if j != i and d[i][j] <= limit)
        if count <= best_count:
            best, best_count = i, count
    return best
`,
  },
  min_cost_connect_points: {
    partial: `
def min_cost_connect_points(points):
    # Partial: chains the points in the order given instead of finding a spanning tree.
    return sum(abs(a[0] - b[0]) + abs(a[1] - b[1]) for a, b in zip(points, points[1:]))
`,
    correct: `
def min_cost_connect_points(points):
    n, INF = len(points), float("inf")
    dist, used, total = [INF] * n, [False] * n, 0
    dist[0] = 0
    for _ in range(n):
        u = min((i for i in range(n) if not used[i]), key=lambda i: dist[i])
        used[u] = True
        total += dist[u]
        for v in range(n):
            if not used[v]:
                cost = abs(points[u][0] - points[v][0]) + abs(points[u][1] - points[v][1])
                dist[v] = min(dist[v], cost)
    return total
`,
  },
  is_bipartite: {
    wrong: `
from collections import deque

def is_bipartite(people, rivalries):
    # Totally incorrect: the colouring is right but every answer is inverted.
    graph = [[] for _ in range(people)]
    for a, b in rivalries:
        graph[a].append(b)
        graph[b].append(a)
    colour = [-1] * people
    for s in range(people):
        if colour[s] != -1:
            continue
        colour[s] = 0
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if colour[v] == -1:
                    colour[v] = 1 - colour[u]
                    queue.append(v)
                elif colour[v] == colour[u]:
                    return True
    return False
`,
    partial: `
def is_bipartite(people, rivalries):
    # Partial: checks degrees instead of colouring, so odd loops slip through.
    degree = [0] * people
    for a, b in rivalries:
        degree[a] += 1
        degree[b] += 1
    return max(degree, default=0) <= 2
`,
    correct: `
from collections import deque

def is_bipartite(people, rivalries):
    graph = [[] for _ in range(people)]
    for a, b in rivalries:
        graph[a].append(b)
        graph[b].append(a)
    colour = [-1] * people
    for s in range(people):
        if colour[s] != -1:
            continue
        colour[s] = 0
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if colour[v] == -1:
                    colour[v] = 1 - colour[u]
                    queue.append(v)
                elif colour[v] == colour[u]:
                    return False
    return True
`,
  },
  count_scc: {
    partial: `
def count_scc(nodes, edges):
    # Partial: ignores edge direction, so it counts weakly connected groups.
    parent = list(range(nodes))
    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x
    for a, b in edges:
        parent[find(a)] = find(b)
    return len({find(i) for i in range(nodes)})
`,
    correct: `
def count_scc(nodes, edges):
    # Kosaraju: finish order on the graph, then sweep the reversed graph.
    graph, reverse = [[] for _ in range(nodes)], [[] for _ in range(nodes)]
    for a, b in edges:
        graph[a].append(b)
        reverse[b].append(a)
    seen, order = [False] * nodes, []
    def first(u):
        seen[u] = True
        for v in graph[u]:
            if not seen[v]:
                first(v)
        order.append(u)
    for u in range(nodes):
        if not seen[u]:
            first(u)
    claimed = [False] * nodes
    def second(u):
        claimed[u] = True
        for v in reverse[u]:
            if not claimed[v]:
                second(v)
    groups = 0
    for u in reversed(order):
        if not claimed[u]:
            second(u)
            groups += 1
    return groups
`,
  },
  permutations: {
    partial: `
def permutations(nums):
    # Partial: only the rotations, not every ordering.
    return [nums[i:] + nums[:i] for i in range(len(nums))]
`,
    correct: `
def permutations(nums):
    out = []
    def go(path, rest):
        if not rest:
            out.append(path)
            return
        for i, x in enumerate(rest):
            go(path + [x], rest[:i] + rest[i + 1:])
    go([], nums)
    return out
`,
  },
  combination_sum: {
    partial: `
def combination_sum(candidates, target):
    candidates, out = sorted(candidates), []
    def go(start, left, path):
        if left == 0:
            out.append(path)
            return
        for i in range(start, len(candidates)):
            if candidates[i] > left:
                break
            go(i + 1, left - candidates[i], path + [candidates[i]])  # Partial: no reuse.
    go(0, target, [])
    return out
`,
    correct: `
def combination_sum(candidates, target):
    candidates, out = sorted(candidates), []
    def go(start, left, path):
        if left == 0:
            out.append(path)
            return
        for i in range(start, len(candidates)):
            if candidates[i] > left:
                break
            go(i, left - candidates[i], path + [candidates[i]])
    go(0, target, [])
    return out
`,
  },
  subsets: {
    partial: `
def subsets(nums):
    # Partial: stops at subsets of two.
    every = [[x for i, x in enumerate(nums) if mask >> i & 1] for mask in range(1 << len(nums))]
    return [s for s in every if len(s) <= 2]
`,
    correct: `
def subsets(nums):
    return [[x for i, x in enumerate(nums) if mask >> i & 1] for mask in range(1 << len(nums))]
`,
  },
  n_queens: {
    partial: `
def n_queens(n):
    # Partial: checks columns and one diagonal direction only.
    count = 0
    def go(r, cols, diag):
        nonlocal count
        if r == n:
            count += 1
            return
        for c in range(n):
            if c in cols or r - c in diag:
                continue
            cols.add(c)
            diag.add(r - c)
            go(r + 1, cols, diag)
            cols.remove(c)
            diag.remove(r - c)
    go(0, set(), set())
    return count
`,
    correct: `
def n_queens(n):
    count = 0
    def go(r, cols, down, up):
        nonlocal count
        if r == n:
            count += 1
            return
        for c in range(n):
            if c in cols or r - c in down or r + c in up:
                continue
            cols.add(c)
            down.add(r - c)
            up.add(r + c)
            go(r + 1, cols, down, up)
            cols.remove(c)
            down.remove(r - c)
            up.remove(r + c)
    go(0, set(), set(), set())
    return count
`,
  },
  word_exists: {
    wrong: `
def word_exists(board, word):
    # Totally incorrect: the search is right but the answer is inverted.
    rows, cols = len(board), len(board[0])
    def go(r, c, i):
        if i == len(word):
            return True
        if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
            return False
        board[r][c] = "#"
        found = any(go(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = word[i]
        return found
    return not any(go(r, c, 0) for r in range(rows) for c in range(cols))
`,
    partial: `
def word_exists(board, word):
    # Partial: never marks cells as used, so a letter can be reused.
    rows, cols = len(board), len(board[0])
    def go(r, c, i):
        if i == len(word):
            return True
        if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
            return False
        return any(go(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    return any(go(r, c, 0) for r in range(rows) for c in range(cols))
`,
    correct: `
def word_exists(board, word):
    rows, cols = len(board), len(board[0])
    def go(r, c, i):
        if i == len(word):
            return True
        if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
            return False
        board[r][c] = "#"
        found = any(go(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = word[i]
        return found
    return any(go(r, c, 0) for r in range(rows) for c in range(cols))
`,
  },
  solve_sudoku: {
    partial: `
def solve_sudoku(board):
    # Partial: fills only cells with a single option, which stalls on hard puzzles.
    changed = True
    while changed:
        changed = False
        for r in range(9):
            for c in range(9):
                if board[r][c] != ".":
                    continue
                used = set(board[r]) | {board[i][c] for i in range(9)}
                used |= {board[r // 3 * 3 + i // 3][c // 3 * 3 + i % 3] for i in range(9)}
                options = set("123456789") - used
                if len(options) == 1:
                    board[r][c] = options.pop()
                    changed = True
    return board
`,
    correct: `
def solve_sudoku(board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empty = []
    for r in range(9):
        for c in range(9):
            d = board[r][c]
            if d == ".":
                empty.append((r, c))
            else:
                rows[r].add(d)
                cols[c].add(d)
                boxes[r // 3 * 3 + c // 3].add(d)
    def options(r, c):
        return set("123456789") - rows[r] - cols[c] - boxes[r // 3 * 3 + c // 3]
    def go():
        if not empty:
            return True
        # Fill the cell with the fewest options first.
        i = min(range(len(empty)), key=lambda k: len(options(*empty[k])))
        r, c = empty[i]
        empty[i] = empty[-1]
        empty.pop()
        for d in options(r, c):
            board[r][c] = d
            rows[r].add(d)
            cols[c].add(d)
            boxes[r // 3 * 3 + c // 3].add(d)
            if go():
                return True
            rows[r].remove(d)
            cols[c].remove(d)
            boxes[r // 3 * 3 + c // 3].remove(d)
        board[r][c] = "."
        empty.append((r, c))
        return False
    go()
    return board
`,
  },
};
