const replaceSafeList = [
  "!",
  ",",
  ".",
  "@",
  "№",
  "#",
  "$",
  ";",
  ":",
  "%",
  "^",
  "&",
  "?",
  "*",
  "(",
  ")",
  "-",
  "=",
  "+",
  "[",
  "]",
  "}",
  "{",
];

const getSafeString = (text: string) => {
  let result = text.toLowerCase();
  replaceSafeList.forEach((char) => {
    result = result.replaceAll(char, "");
  });

  return result;
};

const getSimilarityPercent = (word: string, filterWord: string) => {
  if (word.length < 1) {
    return 0;
  }

  const charList = Array.from(getSafeString(word));
  const filterCharList = Array.from(filterWord);

  let percent = 0;
  const offset = 100 / charList.length;

  charList.forEach((char, index) => {
    if (index <= filterCharList.length - 1 && filterCharList[index] === char) {
      percent += offset;
    } else if (
      index > 0 &&
      index + 1 <= filterCharList.length - 1 &&
      filterCharList[index - 1] === char
    ) {
      percent += offset;
    }
  });

  return percent;
};

export const replaceFilterWords = (text: string, filterText: string) => {
  const filterWords = filterText.split(" ");
  const words = text.split(" ");

  let result = text;

  filterWords.forEach((filterWord) => {
    words.forEach((word) => {
      const similarityPercent = getSimilarityPercent(word, filterWord);
      if (similarityPercent > 70) {
        const replaceText = Array.from(filterWord)
          .map(() => "*")
          .join("");

        if (replaceSafeList.find((s) => word.startsWith(s))) {
          // eslint-disable-next-line no-param-reassign
          word = word.slice(1);
        }
        if (replaceSafeList.find((s) => word.endsWith(s))) {
          // eslint-disable-next-line no-param-reassign
          word = word.slice(0, -1);
        }

        result = result.replace(word, replaceText);
      }
    });
  });

  return result;
};
