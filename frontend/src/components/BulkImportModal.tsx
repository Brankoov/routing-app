import { useState } from "react";
import Tesseract from 'tesseract.js';

type Props = {
  onImport: (addresses: string[]) => void;
  onClose: () => void;
};

// --- 1. SVARTLISTA (Massiv uppdatering för din nya lista) ---
const NOISE_WORDS = [
  // Generella ord
  "brf", "bostadsrättsföreningen", "bostadsrättsförening",
  "ab", "fastighets", "fastighet", "byggnads", "förvaltning",
  "stiftelsen", "stiftelse", "föreningen", "handelsbolag",
  "stads", "stad", "kommun", "service", "partner", "group",
  "nan", "z", "lg", "kolding", "wata", "primula", "technopolis",
  "ng", "aktiebolag", "hb", "kommanditbolag", "hsb", 
  "atrium", "poeten", "jublet", "välbehaget", "herden", "kurt", 
  "decker", "mfl", "kettingen", "bergendahls", "apleträdet", 
  "sandberget", "oscarshemmet", "gyllen", "rekryten",
  "gladan", "västermalms", "sand", "te", "ee", "igheter", "bi", "bit", 
  "vvälbehaget", "fägnaden", "johanssons", "timmermansordern", "stureparken", 
  "björken", "granen", "eken", "kungliga", "vitterhetsakademien", 
  "svensk", "handel", "pension", "tjänstepensionsförening", "gardet", 
  "borgerskapets", "enkehus", "gubbhus", "kornetten", "kapitälets", 
  "kavat", "vård", "humble", "kusoffsky", "kvarteret", "älgen", 
  "bävern", "upa", "fänriken", "trumslagaren", "musketören", 
  "margareta", "bohman", "tamburmajoren", "hirschs", "oscar", "minne",
  "brandförsäkringskontor", "bonfas", "bostad", "kistahöjdens", "sff", 
  "kistaterrassen", "konkret",
  "hotell", "hotel", "plaza", "restaurang", "matsal", "story", "pop",
  "allihoop", "digiram", "sverige", "sweden", "omaka", "sssr", "mornington",
  "kontoret", "bar", "excellence", "education", "jensen", "fisk", "leomar",
  "stadens", "puben", "pub", "östermalmspuben", "remondis", "emonds", "importgatan",
  
  // NYA ORD FRÅN DIN SENASTE BILD:
  "fasching", "musikproduktion", "giseckes", "ignis", "försäkringsförening",
  "glr", "gamla", "stan", "rekonstruktion", "jadstrands", "smakeria",
  "lasse", "i", "roy", "uppland", "sjöfartshusets", "festvåning",
  "lennart", "bror", "livfastigheter", "käpplingeholmen", "wallmans",
  "gürbüz", "operan", "intiman", "claes", "hörnet", "prospero",
  "soya", "ramblas", "biblioteket", "och", "&"
];

function extractAddress(rawLine: string): string | null {
  if (rawLine.length < 5) return null;

  // 1. SPLITTA PÅ ORTEN
  const parts = rawLine.split(/(stockholm|kista|solna|nacka|sundbyberg|danderyd|täby|järfälla|årsta)/i);
  let relevantText = parts[0];

  // --- SPECIFIKA OCR-FIXAR (Plåster för vanliga fel) ---
  relevantText = relevantText.replace(/jankt/gi, "Sankt");
  relevantText = relevantText.replace(/lögberg/gi, "Högberg");
  relevantText = relevantText.replace(/^osa S ing/gi, ""); 
  
  // Fixar för din senaste lista:
  relevantText = relevantText.replace(/Trömgatan/gi, "Strömgatan"); // Fixar "Trömgatan" -> "Strömgatan"
  relevantText = relevantText.replace(/AKlara/gi, "Klara"); // Fixar "AKlara" -> "Klara"
  relevantText = relevantText.replace(/&/g, " "); // Ta bort och-tecken

  // 2. KÖR TVÄTTMASKINEN (Svartlistan)
  NOISE_WORDS.forEach(word => {
    // \b matchar helord. Vi kör extra koll så vi inte tar bort delar av namn felaktigt.
    const noiseRegex = new RegExp(`\\b${word}\\b`, "gi");
    relevantText = relevantText.replace(noiseRegex, " ");
  });

  // 3. GATU-ÄNDELSER
  const streetSuffixes = [
    "gatan", "gata", "vägen", "väg", "gränd", "strand", "torg", 
    "plan", "stig", "backen", "allé", "alle", "höjden", "lid", 
    "promenad", "aveny", "avenyn", "kajen", "kaj", "parken", 
    "terrasen", "terrassen", "gård", "broleden" // Lade till "broleden" för Munkbroleden
  ].join("|");

  // 4. REGEX
  // (Samma som förut, men vi tillåter lite mer stök innan suffixet)
  const regex = new RegExp(
    `((?:[A-Öa-ö\\.-]+\\s+){0,3}[A-Öa-ö\\.-]*?(?:${streetSuffixes}))\\s+([0-9lIOo]+(?:[-/][0-9lIOo]+)?[a-z]?)`, 
    "i"
  );

  const match = relevantText.match(regex);

  if (match) {
    let addressPart = match[1].trim();
    let numberPart = match[2].trim();

    // Rätta siffror
    numberPart = numberPart.replace(/[lI]/g, '1').replace(/[Oo]/g, '0');
    numberPart = numberPart.replace(/^i(\d)/, '$1').replace(/^(\d)i$/, '$1');

    // Snygga till mellanslag
    addressPart = addressPart.replace(/\s+/g, ' ');

    // Fixa vanliga ihopskrivningar
    addressPart = addressPart.replace(/Warfvingesväg/i, "Warfvinges väg");
    addressPart = addressPart.replace(/SanktEriksgatan/i, "Sankt Eriksgatan");

    // Tvinga stor bokstav i början
    if (addressPart.length > 0) {
        // Om första tecknet är 'A' och andra också är stor bokstav (typ "AKlara"), ta bort A:et.
        if (addressPart.length > 2 && addressPart[0] === 'A' && addressPart[1] === addressPart[1].toUpperCase()) {
             addressPart = addressPart.substring(1);
        }
        
        addressPart = addressPart.charAt(0).toUpperCase() + addressPart.slice(1);
    }

    let fullAddress = `${addressPart} ${numberPart}`;
    
    // Lägg till ort
    let city = parts[1] ? parts[1].trim() : "Stockholm";
    city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    
    fullAddress += `, ${city}`;
    
    return fullAddress;
  }

  return null;
}

export function BulkImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const [rawLog, setRawLog] = useState(""); 
  const [showRaw, setShowRaw] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImport = () => {
    const addresses = text
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row.length > 3);

    if (addresses.length > 0) {
      onImport(addresses);
      onClose();
    }
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setProgress(0);
    setRawLog(""); 
    
    try {
      const worker = await Tesseract.createWorker('swe', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.floor(m.progress * 100));
          }
        }
      });
      
      await worker.setParameters({
        tessedit_pageseg_mode: '6' as any, // ÄNDRAT TILL 6 (Assume a single uniform block of text). Funkar ofta bättre på täta listor.
      });

      const result = await worker.recognize(file);
      await worker.terminate();

      const rawText = result.data.text;
      setRawLog(rawText);

      const rawLines = rawText.split('\n');
      
      const uniqueAddresses = new Set<string>();

      rawLines.forEach(line => {
        const extracted = extractAddress(line);
        if (extracted) {
            uniqueAddresses.add(extracted);
        }
      });

      const cleanAddresses = Array.from(uniqueAddresses).join('\n');

      if (!cleanAddresses) {
        alert("Inga adresser hittades. Kolla råtexten.");
      } else {
        setText((prev) => (prev ? prev + "\n" : "") + cleanAddresses);
      }
      
    } catch (err) {
      console.error(err);
      alert("Kunde inte läsa texten.");
    } finally {
      setIsScanning(false);
      setProgress(0);
      e.target.value = ''; 
    }
  };

  return (
    <>
    <style>
        {`
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loader {
            border: 3px solid #f3f3f3; 
            border-top: 3px solid #3498db; 
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 10px;
            vertical-align: middle;
        }
        `}
    </style>
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.6)", zIndex: 2000, backdropFilter: "blur(5px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "90%", maxWidth: "500px", height: "85%",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{ margin: 0 }}>Importera lista</h3>
            <button onClick={onClose} style={{background:'transparent', color:'#888', padding:0, fontSize:'1.5rem'}}>×</button>
        </div>

        <div style={{margin: '1rem 0'}}>
             <label 
                style={{
                    background: isScanning ? '#eee' : '#2196f3',
                    color: isScanning ? '#555' : 'white', 
                    padding: '12px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isScanning ? 'not-allowed' : 'pointer', fontWeight: 'bold',
                    boxShadow: isScanning ? 'none' : '0 2px 5px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                    border: isScanning ? '1px solid #ccc' : 'none'
                }}
             >
                {isScanning ? (
                    <div style={{display:'flex', alignItems:'center'}}>
                        <div className="loader"></div>
                        <span>Bearbetar... {progress}%</span>
                    </div>
                ) : (
                    <>
                        <span style={{marginRight: '10px'}}>📷</span> 
                        Välj bild / Skanna lista
                    </>
                )}
                <input 
                    type="file" accept="image/*" style={{display: 'none'}} 
                    onChange={handleImageScan} disabled={isScanning}
                />
             </label>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Storgatan 1, Stockholm&#10;Lillvägen 2, Solna..."
          style={{
            flex: 1, width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid #ccc", resize: "none", fontSize: "1rem", fontFamily: 'monospace'
          }}
        />

        <div style={{margin: '5px 0'}}>
            <button 
                onClick={() => setShowRaw(!showRaw)}
                style={{background:'none', color:'#666', fontSize:'0.8rem', textDecoration:'underline', padding:0}}
            >
                {showRaw ? 'Dölj råtext' : 'Visa råtext (felsökning)'}
            </button>
            {showRaw && rawLog && (
                <div style={{
                    height: '100px', overflowY:'auto', background:'#f0f0f0', 
                    padding:'5px', fontSize:'0.7rem', marginTop:'5px', border:'1px solid #ccc',
                    whiteSpace: 'pre-wrap'
                }}>
                    {rawLog}
                </div>
            )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: '10px' }}>
          <button onClick={onClose} style={{ flex:1, background: "#ccc", color: "black" }}>Avbryt</button>
          <button onClick={handleImport} disabled={!text.trim()} style={{ flex:1, background: "green", color: "white" }}>Klar</button>
        </div>
      </div>
    </div>
    </>
  );
}