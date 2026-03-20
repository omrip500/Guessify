import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  FaPlay,
  FaPause,
  FaPlus,
  FaTimes,
  FaGripVertical,
  FaEdit,
  FaCheck,
  FaUser,
} from "react-icons/fa";
import { useLazySearchSongsQuery } from "../slices/gamesApiSlice";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// קומפוננטה לפריט שיר שניתן לגרור - מאופטמת עם React.memo
const SortableSongItem = React.memo(
  ({
    song,
    index,
    onRemove,
    onEdit,
    onEditArtist,
  }) => {
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [isEditingArtist, setIsEditingArtist] = React.useState(false);
    const [editedTitle, setEditedTitle] = React.useState(song.title);
    const [editedArtist, setEditedArtist] = React.useState(song.artist);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: song.trackId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? "none" : transition, // ביטול אנימציה בזמן גרירה
      opacity: isDragging ? 0.8 : 1, // פחות שקיפות
      zIndex: isDragging ? 1000 : "auto", // z-index גבוה יותר
    };

    const handleSaveTitleEdit = () => {
      if (editedTitle.trim() && editedTitle !== song.title) {
        onEdit(index, editedTitle.trim());
      }
      setIsEditingTitle(false);
    };

    const handleCancelTitleEdit = () => {
      setEditedTitle(song.title);
      setIsEditingTitle(false);
    };

    const handleSaveArtistEdit = () => {
      if (editedArtist.trim() && editedArtist !== song.artist) {
        onEditArtist(index, editedArtist.trim());
      }
      setIsEditingArtist(false);
    };

    const handleCancelArtistEdit = () => {
      setEditedArtist(song.artist);
      setIsEditingArtist(false);
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center p-3 bg-gray-50 rounded-lg border ${
          isDragging
            ? "shadow-xl bg-white border-blue-400 scale-105"
            : "hover:bg-gray-100 hover:border-gray-300 transition-colors duration-150"
        }`}
      >
        {/* מספר השיר */}
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold mr-3">
          {index + 1}
        </div>

        {/* ידית גרירה */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md mr-2 transition-colors duration-100"
          title="Drag to reorder"
        >
          <FaGripVertical size={14} />
        </div>

        <img
          src={song.artworkUrl}
          alt={song.title}
          className="w-10 h-10 rounded-md mr-3"
        />
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-2 py-1 border border-blue-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter song title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitleEdit();
                  if (e.key === "Escape") handleCancelTitleEdit();
                }}
                autoFocus
              />
              <p className="text-xs text-gray-500">Original: {song.title}</p>
              <p className="text-sm text-gray-600">{song.artist}</p>
            </div>
          ) : isEditingArtist ? (
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{song.title}</p>
              <input
                type="text"
                value={editedArtist}
                onChange={(e) => setEditedArtist(e.target.value)}
                className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter artist name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveArtistEdit();
                  if (e.key === "Escape") handleCancelArtistEdit();
                }}
                autoFocus
              />
              <p className="text-xs text-gray-500">Original: {song.artist}</p>
            </div>
          ) : (
            <>
              <p className="font-medium text-gray-900 truncate">{song.title}</p>
              <p className="text-sm text-gray-600 truncate">{song.artist}</p>
            </>
          )}
        </div>

        {/* כפתורי פעולה */}
        <div className="flex items-center gap-1">
          {isEditingTitle ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveTitleEdit();
                }}
                className="text-green-600 hover:text-green-800 p-1.5 sm:p-2"
                title="Save title changes"
              >
                <FaCheck size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelTitleEdit();
                }}
                className="text-gray-500 hover:text-gray-700 p-1.5 sm:p-2"
                title="Cancel"
              >
                <FaTimes size={14} />
              </button>
            </>
          ) : isEditingArtist ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveArtistEdit();
                }}
                className="text-green-600 hover:text-green-800 p-1.5 sm:p-2"
                title="Save artist changes"
              >
                <FaCheck size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelArtistEdit();
                }}
                className="text-gray-500 hover:text-gray-700 p-1.5 sm:p-2"
                title="Cancel"
              >
                <FaTimes size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2"
                title="Edit song title"
              >
                <FaEdit size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditingArtist(true);
                }}
                className="text-purple-600 hover:text-purple-800 p-1.5 sm:p-2"
                title="Edit artist name"
              >
                <FaUser size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="text-red-500 hover:text-red-700 p-1.5 sm:p-2"
                title="Remove song"
              >
                <FaTimes size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
);

// הוספת שם לקומפוננטה לצורכי debugging
SortableSongItem.displayName = "SortableSongItem";

const SongSearchInput = ({ onSongSelect, selectedSongs = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [searchSongs, { isLoading }] = useLazySearchSongsQuery();

  // הגדרת סנסורים לגרירה - מותאמים לביצועים טובים יותר
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // התחלת גרירה אחרי פיקסל אחד בלבד - מהיר יותר
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // פונקציה לטיפול בסיום גרירה - מאופטמת
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;

      if (active.id !== over?.id && over) {
        const oldIndex = selectedSongs.findIndex(
          (song) => song.trackId === active.id
        );
        const newIndex = selectedSongs.findIndex(
          (song) => song.trackId === over.id
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const newSongs = arrayMove(selectedSongs, oldIndex, newIndex);
          onSongSelect(newSongs, true); // true מציין שזה עדכון של הרשימה
        }
      }
    },
    [selectedSongs, onSongSelect]
  );

  // חיפוש שירים דרך ה-API שלנו
  const handleSearch = useCallback(
    async (term) => {
      if (!term.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      try {
        const result = await searchSongs(term).unwrap();
        setSearchResults(result.results || []);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching songs:", error);
        setSearchResults([]);
        setShowResults(false);
      }
    },
    [searchSongs]
  );

  // debounce לחיפוש
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, handleSearch]);

  // השמעת קטע מהשיר
  const playPreview = (previewUrl, trackId) => {
    if (currentlyPlaying === trackId) {
      // עצירת השמעה
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setCurrentlyPlaying(null);
    } else {
      // עצירת השמעה קודמת
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // השמעה חדשה
      if (previewUrl) {
        // נשתמש ב-URL ישיר - אם יש בעיות CORS, נציג הודעה
        const audioUrl = previewUrl;

        audioRef.current = new Audio(audioUrl);
        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
        setCurrentlyPlaying(trackId);

        // עצירה אוטומטית כשהשיר נגמר
        audioRef.current.onended = () => {
          setCurrentlyPlaying(null);
        };
      }
    }
  };

  // פונקציה ליצירת תשובות נכונות מרובות
  const generateCorrectAnswers = (trackName, artistName) => {
    const answers = [];

    // התשובה המלאה
    answers.push(trackName);

    // הסרת סוגריים ותוכנם
    const withoutParentheses = trackName.replace(/\([^)]*\)/g, "").trim();
    if (withoutParentheses !== trackName && withoutParentheses.length > 0) {
      answers.push(withoutParentheses);
    }

    // הסרת סוגריים מרובעים ותוכנם
    const withoutBrackets = trackName.replace(/\[[^\]]*\]/g, "").trim();
    if (withoutBrackets !== trackName && withoutBrackets.length > 0) {
      answers.push(withoutBrackets);
    }

    // הסרת "feat.", "ft.", "featuring" וכל מה שאחריהם
    const withoutFeat = trackName
      .replace(/\s*(feat\.|ft\.|featuring).*$/i, "")
      .trim();
    if (withoutFeat !== trackName && withoutFeat.length > 0) {
      answers.push(withoutFeat);
    }

    // הסרת מילים נפוצות בסוף כמו "Remix", "Radio Edit", "Extended Version"
    const withoutVersions = trackName
      .replace(
        /\s*(remix|radio edit|extended version|acoustic|live|instrumental).*$/i,
        ""
      )
      .trim();
    if (withoutVersions !== trackName && withoutVersions.length > 0) {
      answers.push(withoutVersions);
    }

    // הסרת סימני פיסוק מיותרים
    const cleanTitle = trackName
      .replace(/[^\w\s\u0590-\u05FF]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleanTitle !== trackName && cleanTitle.length > 0) {
      answers.push(cleanTitle);
    }

    // הסרת כפילויות והחזרת רשימה ייחודית
    return [...new Set(answers)].filter((answer) => answer.length > 0);
  };

  // בחירת שיר
  const selectSong = async (song) => {
    const correctAnswers = generateCorrectAnswers(
      song.trackName,
      song.artistName
    );

    // יצירת אובייקט השיר הבסיסי
    const songData = {
      title: song.trackName,
      artist: song.artistName,
      correctAnswer: song.trackName, // התשובה הראשית
      correctAnswers: correctAnswers, // כל התשובות האפשריות
      previewUrl: song.previewUrl,
      artworkUrl: song.artworkUrl100,
      trackId: song.trackId,
    };

    onSongSelect(songData);
    // לא מוחקים את החיפוש כדי שהמשתמש יוכל להוסיף עוד שירים
    // setSearchTerm("");
    // setShowResults(false);
    // setSearchResults([]);

    // עצירת השמעה אם פועלת
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentlyPlaying(null);
  };

  // בדיקה אם השיר כבר נבחר
  const isSongSelected = (trackId) => {
    return selectedSongs.some((song) => song.trackId === trackId);
  };

  // פונקציה להסרת שיר - מאופטמת
  const removeSong = useCallback(
    (index) => {
      const updatedSongs = selectedSongs.filter((_, i) => i !== index);
      onSongSelect(updatedSongs, true);
    },
    [selectedSongs, onSongSelect]
  );

  // פונקציה לעריכת שיר - מאופטמת
  const editSong = useCallback(
    (index, newTitle) => {
      const updatedSongs = selectedSongs.map((song, i) => {
        if (i === index) {
          const correctAnswers = generateCorrectAnswers(newTitle, song.artist);
          return {
            ...song,
            title: newTitle,
            correctAnswer: newTitle,
            correctAnswers: correctAnswers,
          };
        }
        return song;
      });
      onSongSelect(updatedSongs, true);
    },
    [selectedSongs, onSongSelect]
  );

  // פונקציה לעריכת שם המבצע - מאופטמת
  const editArtist = useCallback(
    (index, newArtist) => {
      const updatedSongs = selectedSongs.map((song, i) => {
        if (i === index) {
          const correctAnswers = generateCorrectAnswers(song.title, newArtist);
          return {
            ...song,
            artist: newArtist,
            artistName: newArtist, // עדכון גם של artistName אם קיים
            correctAnswers: correctAnswers,
          };
        }
        return song;
      });
      onSongSelect(updatedSongs, true);
    },
    [selectedSongs, onSongSelect]
  );

  // רשימת IDs של השירים - מאופטמת
  const songIds = useMemo(
    () => selectedSongs.map((song) => song.trackId),
    [selectedSongs]
  );

  // פונקציה לניקוי החיפוש
  const clearSearch = () => {
    setSearchTerm("");
    setShowResults(false);
    setSearchResults([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentlyPlaying(null);
  };

  return (
    <div className="relative">
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">
          Search Songs
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Type song name or artist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Clear search"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
      </div>

      {/* תוצאות חיפוש */}
      {showResults && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Searching songs...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((song) => (
                <div
                  key={song.trackId}
                  className="flex items-center p-3 hover:bg-gray-50 rounded-lg border-b border-gray-100 last:border-b-0"
                >
                  {/* תמונת האלבום */}
                  <img
                    src={song.artworkUrl60}
                    alt={song.trackName}
                    className="w-12 h-12 rounded-md mr-3"
                  />

                  {/* פרטי השיר */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {song.trackName}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {song.artistName}
                    </p>
                  </div>

                  {/* כפתורי פעולה */}
                  <div className="flex items-center gap-2">
                    {/* כפתור השמעה */}
                    {song.previewUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playPreview(song.previewUrl, song.trackId);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Play preview"
                      >
                        {currentlyPlaying === song.trackId ? (
                          <FaPause size={16} />
                        ) : (
                          <FaPlay size={16} />
                        )}
                      </button>
                    )}

                    {/* כפתור בחירה */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectSong(song);
                      }}
                      disabled={isSongSelected(song.trackId)}
                      className={`p-2 rounded-full transition-colors ${
                        isSongSelected(song.trackId)
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={
                        isSongSelected(song.trackId)
                          ? "Already selected"
                          : "Select song"
                      }
                    >
                      <FaPlus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No results found
            </div>
          )}
        </div>
      )}

      {/* רשימת שירים שנבחרו עם drag and drop */}
      {selectedSongs.length > 0 && (
        <div className="mt-6">
          <div className="flex items-start justify-between mb-4 gap-2">
            <h3 className="text-lg font-semibold text-gray-700 shrink-0">
              Selected Songs ({selectedSongs.length})
            </h3>
            <p className="hidden sm:block text-sm text-gray-500 text-right">
              Drag <FaGripVertical className="inline mx-1" /> to reorder •
              Click <FaEdit className="inline mx-1 text-blue-600" /> to edit
              title • Click <FaUser className="inline mx-1 text-purple-600" />{" "}
              to edit artist
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={songIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedSongs.map((song, index) => (
                  <SortableSongItem
                    key={song.trackId}
                    song={song}
                    index={index}
                    onRemove={removeSong}
                    onEdit={editSong}
                    onEditArtist={editArtist}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

    </div>
  );
};

export default SongSearchInput;
