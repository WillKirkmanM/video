export const contentFilterService = {
  levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  },

  containsBannedWord(
    text: string,
    bannedWords: string[],
    threshold: number
  ): boolean {
    if (!text || !bannedWords || bannedWords.length === 0) return false;

    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, "");

    for (const bannedWord of bannedWords) {
      const lowercaseBanned = bannedWord.toLowerCase();

      const normalizedBanned = lowercaseBanned.replace(/[^\w\s]/g, "");

      if (normalizedText.includes(normalizedBanned)) {
        return true;
      }

      const compressedBanned = normalizedBanned.replace(/\s/g, "");
      if (
        compressedBanned.length > 2 &&
        normalizedText.includes(compressedBanned)
      ) {
        return true;
      }

      if (bannedWord.includes(" ")) {
        const parts = lowercaseBanned.split(" ");
        if (parts.length === 2) {
          const pattern = new RegExp(
            parts[0].charAt(0) + "\\." + "\\s+" + parts[1],
            "i"
          );
          if (text.toLowerCase().match(pattern)) {
            return true;
          }
        }
      }

      const censoredRegex = new RegExp(
        lowercaseBanned.charAt(0) +
          "[\\*\\$#@]+" +
          (lowercaseBanned.length > 2
            ? lowercaseBanned.charAt(lowercaseBanned.length - 1)
            : ""),
        "i"
      );

      if (text.toLowerCase().match(censoredRegex)) {
        return true;
      }
    }

    const words = normalizedText.split(/\s+/);

    for (const word of words) {
      for (const bannedWord of bannedWords) {
        const lowercaseBanned = bannedWord
          .toLowerCase()
          .replace(/[^\w\s]/g, "");

        if (word === lowercaseBanned) {
          return true;
        }

        if (this.isCensoredVersion(word, lowercaseBanned)) {
          return true;
        }

        const wordLength = Math.max(word.length, lowercaseBanned.length);
        let adjustedThreshold = threshold;

        if (wordLength <= 3) {
          adjustedThreshold = 0;
        } else if (wordLength <= 5) {
          adjustedThreshold = Math.min(threshold, 1);
        } else {
          adjustedThreshold = Math.min(threshold, Math.floor(wordLength / 4));
        }

        if (adjustedThreshold === 0 && word !== lowercaseBanned) {
          continue;
        }

        const distance = this.levenshteinDistance(word, lowercaseBanned);
        if (distance <= adjustedThreshold) {
          return true;
        }
      }
    }

    return false;
  },

  isCensoredVersion(word: string, bannedWord: string): boolean {
    if (Math.abs(word.length - bannedWord.length) > 3) {
      return false;
    }

    if (word.charAt(0).toLowerCase() !== bannedWord.charAt(0).toLowerCase()) {
      return false;
    }

    if (word.match(new RegExp(`^${bannedWord.charAt(0)}\\*+$`, "i"))) {
      return true;
    }

    if (
      word.toLowerCase().startsWith(bannedWord.toLowerCase().substring(0, 4)) &&
      word.includes("*")
    ) {
      return true;
    }

    if (
      word.length >= 3 &&
      word.charAt(0).toLowerCase() === bannedWord.charAt(0).toLowerCase() &&
      word.charAt(word.length - 1).toLowerCase() ===
        bannedWord.charAt(bannedWord.length - 1).toLowerCase() &&
      word.slice(1, -1).match(/^[\*\$#@]+$/)
    ) {
      return true;
    }

    let censoredPattern = bannedWord
      .split("")
      .map((char, i) => (i === 0 ? char : "[\\*\\$#@]"))
      .join("");

    if (word.match(new RegExp(`^${censoredPattern}$`, "i"))) {
      return true;
    }

    return false;
  },

  isShortFormContent(lengthSeconds: number, threshold: number): boolean {
    return lengthSeconds < threshold;
  },

  async shouldFilterVideo(
    video: any
  ): Promise<{ filtered: boolean; reason: string }> {
    if (typeof localStorage === "undefined") {
      return { filtered: false, reason: "" };
    }

    try {
      const bannedWords = JSON.parse(
        localStorage.getItem("bannedWords") || "[]"
      );
      const bannedChannels = JSON.parse(
        localStorage.getItem("bannedChannels") || "[]"
      );
      const levenshteinThreshold = parseInt(
        localStorage.getItem("levenshteinThreshold") || "1"
      );
      const banShortForm = localStorage.getItem("banShortForm") === "true";
      const shortFormThreshold = parseInt(
        localStorage.getItem("shortFormThreshold") || "60"
      );

      if (bannedChannels.length > 0 && video.authorId) {
        const isBannedChannel = bannedChannels.some(
          (channel: { id: any }) => channel.id === video.authorId
        );
        if (isBannedChannel) {
          return { filtered: true, reason: "Channel is banned" };
        }
      }

      if (bannedWords.length > 0) {
        if (
          video.title &&
          this.containsBannedWord(
            video.title,
            bannedWords,
            levenshteinThreshold
          )
        ) {
          return { filtered: true, reason: "Contains banned word in title" };
        }

        if (
          video.description &&
          this.containsBannedWord(
            video.description,
            bannedWords,
            levenshteinThreshold
          )
        ) {
          return { filtered: true, reason: "Description contains banned word" };
        }

        if (
          video.author &&
          this.containsBannedWord(
            video.author,
            bannedWords,
            levenshteinThreshold
          )
        ) {
          return {
            filtered: true,
            reason: "Channel name contains banned word",
          };
        }

        if (video.author && video.author.includes("- Topic")) {
          const channelName = video.author.split("- Topic")[0].trim();
          if (
            this.containsBannedWord(
              channelName,
              bannedWords,
              levenshteinThreshold
            )
          ) {
            return {
              filtered: true,
              reason:
                "Channel name (without Topic suffix) contains banned word",
            };
          }
        }
      }

      if (
        banShortForm &&
        video.lengthSeconds &&
        this.isShortFormContent(video.lengthSeconds, shortFormThreshold)
      ) {
        return { filtered: true, reason: "Short form content" };
      }
    } catch (error) {
      console.error("Error in content filtering:", error);
    }

    return { filtered: false, reason: "" };
  },
};
