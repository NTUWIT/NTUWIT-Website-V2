// Linked List, Stack & Queue, Binary Search, Trees.
import type { Solutions } from "./types";

export const PART2: Solutions = {
  middle_node: {
    partial: `
def middle_node(head):
    slow = fast = head
    # Partial: stops one step early, returning the first middle of an even list.
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    return slow
`,
    correct: `
def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
`,
  },
  find_duplicate: {
    partial: `
def find_duplicate(nums):
    # Partial: the sum trick assumes the repeat appears exactly twice.
    n = len(nums) - 1
    return sum(nums) - n * (n + 1) // 2
`,
    correct: `
def find_duplicate(nums):
    # Floyd: values are pointers, and the repeat is where the chain loops.
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow
`,
  },
  reverse_k_group: {
    partial: `
def reverse_k_group(head, size):
    # Partial: also reverses the final short group.
    vals = []
    while head:
        vals.append(head.val)
        head = head.next
    out = []
    for i in range(0, len(vals), size):
        out += vals[i:i + size][::-1]
    dummy = tail = ListNode()
    for v in out:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next
`,
    correct: `
def reverse_k_group(head, size):
    dummy = ListNode(0, head)
    before = dummy
    while True:
        end = before
        for _ in range(size):
            end = end.next
            if end is None:
                return dummy.next
        first, after = before.next, end.next
        prev, node = after, first
        while node is not after:
            node.next, prev, node = prev, node, node.next
        before.next = end
        before = first
`,
  },
  merge_two_lists: {
    partial: `
def merge_two_lists(first, second):
    dummy = tail = ListNode()
    while first and second:
        if first.val <= second.val:
            tail.next, first = first, first.next
        else:
            tail.next, second = second, second.next
        tail = tail.next
    tail.next = first  # Partial: whatever is left of the second list is dropped.
    return dummy.next
`,
    correct: `
def merge_two_lists(first, second):
    dummy = tail = ListNode()
    while first and second:
        if first.val <= second.val:
            tail.next, first = first, first.next
        else:
            tail.next, second = second, second.next
        tail = tail.next
    tail.next = first or second
    return dummy.next
`,
  },
  remove_nth_from_end: {
    partial: `
def remove_nth_from_end(head, n):
    # Partial: no dummy node, so removing the first node crashes.
    fast = slow = head
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return head
`,
    correct: `
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next
`,
  },
  daily_temperatures: {
    partial: `
def daily_temperatures(temps):
    # Partial: only ever looks at the next day.
    return [1 if i + 1 < len(temps) and temps[i + 1] > t else 0 for i, t in enumerate(temps)]
`,
    correct: `
def daily_temperatures(temps):
    out, stack = [0] * len(temps), []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            out[j] = i - j
        stack.append(i)
    return out
`,
  },
  window_maxes: {
    partial: `
def window_maxes(nums, width):
    # Partial: compares only the two ends of each window.
    return [max(nums[i], nums[i + width - 1]) for i in range(len(nums) - width + 1)]
`,
    correct: `
from collections import deque

def window_maxes(nums, width):
    queue, out = deque(), []
    for i, x in enumerate(nums):
        while queue and nums[queue[-1]] <= x:
            queue.pop()
        queue.append(i)
        if queue[0] <= i - width:
            queue.popleft()
        if i >= width - 1:
            out.append(nums[queue[0]])
    return out
`,
  },
  brackets_match: {
    wrong: `
def brackets_match(text):
    # Totally incorrect: the stack is right but every answer is inverted.
    pairs, stack = {")": "(", "]": "[", "}": "{"}, []
    for ch in text:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return True
        else:
            stack.append(ch)
    return bool(stack)
`,
    partial: `
def brackets_match(text):
    # Partial: counts each kind but ignores order.
    return all(text.count(o) == text.count(c) for o, c in ("()", "[]", "{}"))
`,
    correct: `
def brackets_match(text):
    pairs, stack = {")": "(", "]": "[", "}": "{"}, []
    for ch in text:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
`,
  },
  min_stack: {
    partial: `
def min_stack(ops, values):
    # Partial: remembers the smallest value ever pushed, even after it is popped.
    stack, out, lowest = [], [], None
    for op, v in zip(ops, values):
        if op == "push":
            stack.append(v)
            lowest = v if lowest is None else min(lowest, v)
        elif op == "pop":
            stack.pop()
        elif op == "top":
            out.append(stack[-1])
        else:
            out.append(lowest)
    return out
`,
    correct: `
def min_stack(ops, values):
    # Each entry carries the minimum at the time it was pushed.
    stack, out = [], []
    for op, v in zip(ops, values):
        if op == "push":
            stack.append((v, min(v, stack[-1][1]) if stack else v))
        elif op == "pop":
            stack.pop()
        elif op == "top":
            out.append(stack[-1][0])
        else:
            out.append(stack[-1][1])
    return out
`,
  },
  binary_search: {
    partial: `
def binary_search(sorted_nums, target):
    lo, hi = 0, len(sorted_nums) - 1
    while lo < hi:  # Partial: should be <=, so the last candidate is never checked.
        mid = (lo + hi) // 2
        if sorted_nums[mid] == target:
            return mid
        if sorted_nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
    correct: `
def binary_search(sorted_nums, target):
    lo, hi = 0, len(sorted_nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if sorted_nums[mid] == target:
            return mid
        if sorted_nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
  },
  min_eating_speed: {
    partial: `
def min_eating_speed(piles, hours):
    # Partial: total / hours ignores that a part-eaten pile still costs a whole hour.
    return max(1, -(-sum(piles) // hours))
`,
    correct: `
def min_eating_speed(piles, hours):
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if sum((p + mid - 1) // mid for p in piles) <= hours:
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
  },
  search_rotated: {
    partial: `
def search_rotated(nums, target):
    # Partial: a plain binary search, as if the list were not rotated.
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
    correct: `
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
`,
  },
  search_range: {
    partial: `
from bisect import bisect_left

def search_range(sorted_nums, target):
    lo = bisect_left(sorted_nums, target)
    if lo == len(sorted_nums) or sorted_nums[lo] != target:
        return [-1, -1]
    return [lo, lo]  # Partial: assumes the target appears once.
`,
    correct: `
from bisect import bisect_left, bisect_right

def search_range(sorted_nums, target):
    lo = bisect_left(sorted_nums, target)
    if lo == len(sorted_nums) or sorted_nums[lo] != target:
        return [-1, -1]
    return [lo, bisect_right(sorted_nums, target) - 1]
`,
  },
  traversals: {
    partial: `
def traversals(root):
    pre, ino = [], []
    def walk(n):
        if n:
            pre.append(n.val)
            walk(n.left)
            ino.append(n.val)
            walk(n.right)
    walk(root)
    # Partial: postorder is not preorder reversed.
    return [pre, ino, pre[::-1]]
`,
    correct: `
def traversals(root):
    pre, ino, post = [], [], []
    def walk(n):
        if n:
            pre.append(n.val)
            walk(n.left)
            ino.append(n.val)
            walk(n.right)
            post.append(n.val)
    walk(root)
    return [pre, ino, post]
`,
  },
  level_averages: {
    partial: `
def level_averages(root):
    out, level = [], [root] if root else []
    while level:
        # Partial: integer division throws away the .5
        out.append(float(sum(n.val for n in level) // len(level)))
        level = [c for n in level for c in (n.left, n.right) if c]
    return out
`,
    correct: `
def level_averages(root):
    out, level = [], [root] if root else []
    while level:
        out.append(sum(n.val for n in level) / len(level))
        level = [c for n in level for c in (n.left, n.right) if c]
    return out
`,
  },
  insert_into_bst: {
    partial: `
def insert_into_bst(root, value):
    # Partial: crashes on an empty tree.
    node = root
    while True:
        if value < node.val:
            if node.left is None:
                node.left = TreeNode(value)
                return root
            node = node.left
        else:
            if node.right is None:
                node.right = TreeNode(value)
                return root
            node = node.right
`,
    correct: `
def insert_into_bst(root, value):
    if root is None:
        return TreeNode(value)
    node = root
    while True:
        if value < node.val:
            if node.left is None:
                node.left = TreeNode(value)
                return root
            node = node.left
        else:
            if node.right is None:
                node.right = TreeNode(value)
                return root
            node = node.right
`,
  },
  lowest_common_ancestor: {
    partial: `
def lowest_common_ancestor(root, p, q):
    # Partial: steers by value as if the tree were a search tree.
    node = root
    while node:
        if p < node.val and q < node.val:
            node = node.left
        elif p > node.val and q > node.val:
            node = node.right
        else:
            return node.val
    return None
`,
    correct: `
def lowest_common_ancestor(root, p, q):
    def walk(n):
        if n is None or n.val in (p, q):
            return n
        left, right = walk(n.left), walk(n.right)
        return n if left and right else left or right
    return walk(root).val
`,
  },
  build_tree: {
    partial: `
def build_tree(preorder, inorder):
    # Partial: ignores inorder and inserts as if into a search tree.
    root = None
    for v in preorder:
        if root is None:
            root = TreeNode(v)
            continue
        node = root
        while True:
            side = "left" if v < node.val else "right"
            if getattr(node, side) is None:
                setattr(node, side, TreeNode(v))
                break
            node = getattr(node, side)
    return root
`,
    correct: `
def build_tree(preorder, inorder):
    where = {v: i for i, v in enumerate(inorder)}
    values = iter(preorder)
    def build(lo, hi):
        if lo > hi:
            return None
        v = next(values)
        node = TreeNode(v)
        node.left = build(lo, where[v] - 1)
        node.right = build(where[v] + 1, hi)
        return node
    return build(0, len(inorder) - 1)
`,
  },
  autocomplete: {
    partial: `
def autocomplete(words, prefix):
    # Partial: keeps the input order instead of sorting.
    return [w for w in words if w.startswith(prefix)][:3]
`,
    correct: `
def autocomplete(words, prefix):
    trie = {}
    for w in words:
        node = trie
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w
    node = trie
    for ch in prefix:
        if ch not in node:
            return []
        node = node[ch]
    out = []
    def walk(n):
        if len(out) == 3:
            return
        if "$" in n:
            out.append(n["$"])
        for ch in sorted(k for k in n if k != "$"):
            walk(n[ch])
    walk(node)
    return out[:3]
`,
  },
  find_words: {
    partial: `
def find_words(board, words):
    # Partial: checks the letters exist, not that they form a path.
    letters = {ch for row in board for ch in row}
    return [w for w in words if set(w) <= letters]
`,
    correct: `
def find_words(board, words):
    trie = {}
    for w in words:
        node = trie
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w
    found, rows, cols = set(), len(board), len(board[0])
    def dfs(r, c, node):
        ch = board[r][c]
        if ch not in node:
            return
        nxt = node[ch]
        if "$" in nxt:
            found.add(nxt["$"])
        board[r][c] = "#"
        for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= rr < rows and 0 <= cc < cols:
                dfs(rr, cc, nxt)
        board[r][c] = ch
    for r in range(rows):
        for c in range(cols):
            dfs(r, c, trie)
    return list(found)
`,
  },
  range_sum_queries: {
    partial: `
def range_sum_queries(nums, ops):
    n = len(nums)
    tree = [0] * (n + 1)
    def add(i, delta):
        i += 1
        while i <= n:
            tree[i] += delta
            i += i & -i
    def prefix(i):
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & -i
        return s
    for i, v in enumerate(nums):
        add(i, v)
    out = []
    for kind, a, b in ops:
        if kind == 0:
            add(a, b)  # Partial: adds the new value instead of setting it.
        else:
            out.append(prefix(b + 1) - prefix(a))
    return out
`,
    correct: `
def range_sum_queries(nums, ops):
    n = len(nums)
    tree, values = [0] * (n + 1), list(nums)
    def add(i, delta):
        i += 1
        while i <= n:
            tree[i] += delta
            i += i & -i
    def prefix(i):
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & -i
        return s
    for i, v in enumerate(nums):
        add(i, v)
    out = []
    for kind, a, b in ops:
        if kind == 0:
            add(a, b - values[a])
            values[a] = b
        else:
            out.append(prefix(b + 1) - prefix(a))
    return out
`,
  },
  rob_tree: {
    partial: `
def rob_tree(root):
    # Partial: takes whole alternate levels, which is not always best.
    sums, level, depth = [0, 0], [root] if root else [], 0
    while level:
        sums[depth % 2] += sum(n.val for n in level)
        level = [c for n in level for c in (n.left, n.right) if c]
        depth += 1
    return max(sums)
`,
    correct: `
def rob_tree(root):
    def go(n):
        if not n:
            return (0, 0)
        left, right = go(n.left), go(n.right)
        return (n.val + left[1] + right[1], max(left) + max(right))
    return max(go(root))
`,
  },
};
