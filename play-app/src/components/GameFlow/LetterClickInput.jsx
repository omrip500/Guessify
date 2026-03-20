import React, { useState, useEffect } from "react";

const LetterClickInput = ({
  songTitle,
  onGuessChange,
  onSubmitGuess,
  onSkipSong,
  hasGuessed,
  isWaiting,
  isGameOver,
}) => {
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [availableLetters, setAvailableLetters] = useState([]);
  const [songDashes, setSongDashes] = useState([]);

  // יצירת מערך האותיות הזמינות והמקפים
  useEffect(() => {
    if (songTitle) {
      // יצירת מערך המקפים (רק אותיות, לא רווחים או סימני פיסוק)
      const dashes = songTitle.split("").map((char, index) => ({
        char: char,
        isLetter: /[\u0590-\u05FF]/.test(char), // בדיקה אם זה אות עברית
        filled: false, // כל האותיות מתחילות ריקות
        selectedLetter: null, // אין אות נבחרת בהתחלה
        index: index,
      }));
      setSongDashes(dashes);

      // יצירת מערך האותיות הזמינות (אותיות השיר + אותיות נוספות)
      const songLetters = songTitle
        .split("")
        .filter((char) => /[\u0590-\u05FF]/.test(char)); // אותיות עברית בלבד

      // ספירת כמות כל אות בשיר
      const letterCounts = {};
      songLetters.forEach((letter) => {
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      });

      // יצירת מערך עם כמות נכונה של כל אות
      const neededLetters = [];
      Object.entries(letterCounts).forEach(([letter, count]) => {
        for (let i = 0; i < count; i++) {
          neededLetters.push(letter);
        }
      });

      const uniqueSongLetters = [...new Set(songLetters)];

      // הוספת אותיות עבריות נוספות כדי להקשות
      const allHebrewLetters = "אבגדהוזחטיכלמנסעפצקרשת".split("");
      const extraLetters = allHebrewLetters.filter(
        (letter) => !uniqueSongLetters.includes(letter)
      );

      // בחירת 8-12 אותיות נוספות באקראי
      const shuffledExtra = extraLetters.sort(() => 0.5 - Math.random());
      const selectedExtra = shuffledExtra.slice(
        0,
        Math.min(10, extraLetters.length)
      );

      // שילוב האותיות וערבוב - כולל כמות נכונה של כל אות
      const allLetters = [...neededLetters, ...selectedExtra].sort(
        () => 0.5 - Math.random()
      );

      setAvailableLetters(
        allLetters.map((letter) => ({
          letter: letter,
          used: false,
        }))
      );
    }
  }, [songTitle]);

  // טיפול בלחיצה על אות
  const handleLetterClick = (letterIndex) => {
    if (hasGuessed || isWaiting || isGameOver) return;

    const letter = availableLetters[letterIndex];
    if (letter.used) return;

    // מציאת המקום הראשון הפנוי במקפים (מימין לשמאל)
    // בגלל dir="rtl", המקף הראשון במערך מוצג ימינה ביותר
    let firstEmptyDash = null;
    for (let i = 0; i < songDashes.length; i++) {
      if (songDashes[i].isLetter && !songDashes[i].filled) {
        firstEmptyDash = songDashes[i];
        break;
      }
    }
    if (!firstEmptyDash) return;

    // עדכון המקפים
    const letterToPlace = letter.letter;

    const newDashes = songDashes.map((dash) =>
      dash.index === firstEmptyDash.index
        ? { ...dash, filled: true, selectedLetter: letterToPlace }
        : dash
    );
    setSongDashes(newDashes);

    // סימון האות כמשומשת
    const newAvailableLetters = availableLetters.map((l, i) =>
      i === letterIndex ? { ...l, used: true } : l
    );
    setAvailableLetters(newAvailableLetters);

    // עדכון הניחוש - בניית התשובה בסדר הנכון כולל רווחים
    const currentGuess = newDashes
      .map((dash) => {
        if (dash.isLetter) {
          return dash.selectedLetter || "_";
        } else {
          return dash.char; // רווח או סימן פיסוק
        }
      })
      .join("");

    setSelectedLetters([...selectedLetters, letter.letter]);
    onGuessChange(currentGuess);
  };

  // טיפול בלחיצה על מקף (הסרת אות)
  const handleDashClick = (dashIndex) => {
    if (hasGuessed || isWaiting || isGameOver) return;

    const dash = songDashes[dashIndex];
    if (!dash.filled || !dash.selectedLetter) return;

    // הסרת האות מהמקף
    const newDashes = [...songDashes];
    newDashes[dashIndex] = {
      ...newDashes[dashIndex],
      filled: false,
      selectedLetter: null,
    };
    setSongDashes(newDashes);

    // החזרת האות לרשימת האותיות הזמינות
    const newAvailableLetters = availableLetters.map((letter) =>
      letter.letter === dash.selectedLetter
        ? { ...letter, used: false }
        : letter
    );
    setAvailableLetters(newAvailableLetters);

    // הסרה מרשימת האותיות הנבחרות
    const newSelectedLetters = [...selectedLetters];
    const letterToRemoveIndex = newSelectedLetters.lastIndexOf(
      dash.selectedLetter
    );
    if (letterToRemoveIndex > -1) {
      newSelectedLetters.splice(letterToRemoveIndex, 1);
    }
    setSelectedLetters(newSelectedLetters);

    // עדכון הניחוש - בניית התשובה בסדר הנכון כולל רווחים
    const currentGuess = newDashes
      .map((dash) => {
        if (dash.isLetter) {
          return dash.selectedLetter || "_";
        } else {
          return dash.char; // רווח או סימן פיסוק
        }
      })
      .join("");
    onGuessChange(currentGuess);
  };

  // איפוס הניחוש
  const handleReset = () => {
    if (hasGuessed || isWaiting || isGameOver) return;

    setSongDashes(
      songDashes.map((dash) =>
        dash.isLetter ? { ...dash, filled: false, selectedLetter: null } : dash
      )
    );
    setAvailableLetters(availableLetters.map((l) => ({ ...l, used: false })));
    setSelectedLetters([]);
    onGuessChange("");
  };

  // בדיקה אם הניחוש מלא
  const isGuessComplete = songDashes
    .filter((dash) => dash.isLetter)
    .every((dash) => dash.filled);

  return (
    <div className="space-y-4">
      {/* מקפים לשם השיר */}
      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 border border-white border-opacity-30">
        <div
          className="flex flex-wrap justify-center gap-3 text-xl font-bold"
          dir="rtl"
        >
          {(() => {
            // קיבוץ המקפים לפי מילים
            const words = [];
            let currentWord = [];

            songDashes.forEach((dash, index) => {
              if (dash.char === " ") {
                if (currentWord.length > 0) {
                  words.push(currentWord);
                  currentWord = [];
                }
              } else {
                currentWord.push(dash);
              }
            });

            // הוספת המילה האחרונה אם קיימת
            if (currentWord.length > 0) {
              words.push(currentWord);
            }

            return words.map((word, wordIndex) => (
              <div key={wordIndex} className="flex gap-1">
                {word.map((dash, dashIndex) => (
                  <span
                    key={`${wordIndex}-${dashIndex}`}
                    className="inline-block"
                  >
                    {dash.isLetter ? (
                      <button
                        onClick={() => handleDashClick(dash.index)}
                        disabled={
                          !dash.filled || hasGuessed || isWaiting || isGameOver
                        }
                        className="w-7 h-8 bg-white bg-opacity-30 border-2 border-white border-opacity-50 rounded-lg flex items-center justify-center text-white hover:bg-opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-default text-sm"
                      >
                        {dash.filled ? dash.selectedLetter : "_"}
                      </button>
                    ) : (
                      <span className="text-white px-1">{dash.char}</span>
                    )}
                  </span>
                ))}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* אותיות זמינות */}
      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 border border-white border-opacity-30">
        <h4 className="text-white font-semibold mb-3 text-center text-sm">
          Choose Letters:
        </h4>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-2" dir="rtl">
          {availableLetters.map((letterObj, index) => (
            <button
              key={index}
              onClick={() => handleLetterClick(index)}
              disabled={letterObj.used || hasGuessed || isWaiting || isGameOver}
              className={`
                w-8 h-8 rounded-lg font-bold text-base transition-all duration-200 text-center
                ${
                  letterObj.used
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-50"
                    : "bg-white text-purple-600 hover:bg-purple-100 hover:scale-105 cursor-pointer shadow-md"
                }
                ${
                  hasGuessed || isWaiting || isGameOver
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }
              `}
            >
              {letterObj.letter}
            </button>
          ))}
        </div>
      </div>

      {/* כפתורי פעולה */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          disabled={
            hasGuessed ||
            isWaiting ||
            isGameOver ||
            selectedLetters.length === 0
          }
          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-2xl transition-all duration-300 text-base"
        >
          🔄 Reset
        </button>

        <button
          onClick={onSubmitGuess}
          disabled={!isGuessComplete || hasGuessed || isWaiting || isGameOver}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-2xl transition-all duration-300 text-base flex items-center justify-center gap-2"
        >
          <span className="text-lg">🚀</span>
          Submit
          <span className="text-lg">🎯</span>
        </button>

        {/* Skip Button */}
        {onSkipSong && (
          <button
            onClick={onSkipSong}
            disabled={hasGuessed || isWaiting || isGameOver}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold px-4 py-3 rounded-2xl transition-all duration-300 text-base flex items-center justify-center gap-2"
          >
            <span className="text-lg">⏭️</span>
            Skip
          </button>
        )}
      </div>

      {/* הודעת עזרה */}
      {!isGuessComplete && !hasGuessed && (
        <div className="text-center text-purple-200 text-sm space-y-1">
          <div>Click on letters to fill in the song name</div>
          <div className="text-xs">
            💡 Or type the artist name in chat!
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterClickInput;
