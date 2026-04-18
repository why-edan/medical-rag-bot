def most_frequent(s):
    freq = {}

    # Step 1: count
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1

    # Step 2: find max
    max_char = None
    max_count = 0

    for ch in freq:
        if freq[ch]>max_count:
            max_count=freq[ch]
            max_char=ch

    return max_char

print(most_frequent("aaabbccccd"))