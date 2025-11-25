import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../api/config";

export default function AutoAddressInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);
  
  // NYTT: Håll koll på om vi faktiskt står i fältet
  const [hasFocus, setHasFocus] = useState(false);

  const shouldSearch = useRef(true);

  useEffect(() => {
    if (!shouldSearch.current) return;

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;

    const fetchData = async () => {
      try {
        const url = `${API_BASE_URL}/api/geocode/suggest?q=${encodeURIComponent(value)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();

        if (active) {
          const goodResults = data.filter((s: any) => !isJustCountry(s.label));
          setSuggestions(goodResults);
        }
      } catch (e) {
        console.error(e);
        if (active) setSuggestions([]);
      }
    };

    const t = setTimeout(fetchData, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value]);

  function isJustCountry(label: string) {
    const countries = ["Sweden", "Sverige", "Norge", "Finland", "Denmark"];
    return countries.includes(label.trim());
  }

  const formatSuggestion = (suggestionLabel: string, userInput: string) => {
    const userNumberMatch = userInput.match(/(\d+[a-zA-Z]?)$/);
    if (!userNumberMatch) return suggestionLabel;

    const number = userNumberMatch[0];
    if (suggestionLabel.includes(number)) return suggestionLabel;

    const parts = suggestionLabel.split(",");
    if (parts.length > 0) {
        parts[0] = parts[0].trim() + " " + number;
        return parts.join(",");
    }
    return suggestionLabel + " " + number;
  };

  const handleInputChange = (val: string) => {
    shouldSearch.current = true;
    onChange(val);
  };

  const handleSelect = (suggestionLabel: string) => {
    shouldSearch.current = false;
    setSuggestions([]);
    const finalValue = formatSuggestion(suggestionLabel, value);
    onChange(finalValue);
  };

  return (
    <div style={{ position: "relative" }}>
      <label>
        {label}
        <input
          type="text"
          value={value}
          // NYTT: Stäng av webbläsarens egna förslag
          autoComplete="off" 
          
          onChange={(e) => handleInputChange(e.target.value)}
          
          // NYTT: Hantera fokus striktare
          onFocus={() => setHasFocus(true)}
          onBlur={() => {
            // Liten fördröjning så klick hinner registreras
            setTimeout(() => {
              setHasFocus(false);
              setSuggestions([]); // Rensa listan också för säkerhets skull
            }, 200);
          }}
          
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          placeholder="Sök adress..."
        />
      </label>

      {/* NYTT: Visa BARA om vi har fokus OCH förslag */}
      {hasFocus && suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 1000,
            listStyle: "none",
            margin: 0,
            padding: 0,
            background: "white",
            color: "black",
            border: "1px solid #ccc",
            width: "100%",
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {suggestions.map((s, i) => {
            const displayLabel = formatSuggestion(s.label, value);
            return (
              <li
                key={i}
                onMouseDown={() => handleSelect(s.label)} 
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
              >
                {displayLabel}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}