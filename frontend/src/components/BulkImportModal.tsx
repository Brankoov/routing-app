import { useState } from "react";
import Tesseract from 'tesseract.js';

type Props = {
  onImport: (addresses: string[]) => void;
  onClose: () => void;
};

// --- 1. SVARTLISTA (Ord vi VET ska bort) ---
// Vi fyller på denna med allt skräp vi sett i dina bilder.
const NOISE_WORDS = [
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
  "kistaterrassen", "konkret"
];

function extractAddress(rawLine: string): string | null {
  if (rawLine.length < 5) return null;

  // 1. SPLITTA PÅ ORTEN (För att inte läsa nyckel-koder som adresser)
  const parts = rawLine.split(/(stockholm|kista|solna|nacka|sundbyberg|danderyd|täby|järfälla)/i);
  let relevantText = parts[0];

  // 2. KÖR TVÄTTMASKINEN
  // Ersätt alla svartlistade ord med mellanslag.
  NOISE_WORDS.forEach(word => {
    // \b betyder "helord", så vi inte råkar ta bort "sand" i "Sandsborgsvägen"
    const noiseRegex = new RegExp(`\\b${word}\\b`, "gi");
    relevantText = relevantText.replace(noiseRegex, " ");
  });

  // 3. GATU-ÄNDELSER
  const streetSuffixes = [
    "gatan", "gata", "vägen", "väg", "gränd", "strand", "torg", 
    "plan", "stig", "backen", "allé", "alle", "höjden", "lid", 
    "promenad", "aveny", "avenyn", "kajen", "kaj", "parken"
  ].join("|");

  // 4. REGEX (Den tillåtande versionen)
  // Vi letar efter:
  // - Upp till 3 ord innan suffixet ((?:[A-Öa-ö\.-]+\s+){0,3})
  // - Ett ord som slutar på suffixet (t.ex ...gatan)
  // - Siffror efteråt
  
  const regex = new RegExp(
    `((?:[A-Öa-ö\\.-]+\\s+){0,3}[A-Öa-ö\\.-]*?(?:${streetSuffixes}))\\s+([0-9lIOo]+(?:[-/][0-9lIOo]+)?[a-z]?)`, 
    "i"
  );

  const match = relevantText.match(regex);

  if (match) {
    let addressPart = match[1].trim();
    let numberPart = match[2].trim();

    // Rätta siffror (l -> 1, O -> 0)
    numberPart = numberPart.replace(/[lI]/g, '1').replace(/[Oo]/g, '0');
    // Ta bort "i" om det smugit sig in i numret (t.ex "i1")
    numberPart = numberPart.replace(/^i(\d)/, '$1').replace(/^(\d)i$/, '$1');

    // Snygga till mellanslag
    addressPart = addressPart.replace(/\s+/g, ' ');

    // Fixa vanliga ihopskrivningar (Tesseract gillar inte Warfvinges)
    addressPart = addressPart.replace(/Warfvingesväg/i, "Warfvinges väg");
    addressPart = addressPart.replace(/SanktEriksgatan/i, "Sankt Eriksgatan");

    // VIKTIGT: Här tog jag bort "dörrvakten". 
    // Vi klipper INTE bort ord baserat på gissningar längre.
    // Det som Regexen hittade (efter att vi tvättat bort skräporden) behåller vi.
    
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
    setRawLog(""); 
    
    try {
      const worker = await Tesseract.createWorker('swe');
      
      // Vi kör standard-läget (PSM 3). Det är oftast bäst för tabeller/listor
      // där texten kan vara lite hoppig.
      await worker.setParameters({
        tessedit_pageseg_mode: '3' as any, 
      });

      const result = await worker.recognize(file);
      await worker.terminate();

      const rawText = result.data.text;
      setRawLog(rawText);

      const rawLines = rawText.split('\n');
      
      const cleanAddresses = rawLines
        .map(line => extractAddress(line)) 
        .filter(addr => addr !== null)
        // Ta bort exakta dubbletter
        .filter((value, index, self) => self.indexOf(value) === index) 
        .join('\n');

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
      e.target.value = ''; 
    }
  };

  return (
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
                    background: isScanning ? '#ccc' : '#2196f3',
                    color: 'white', padding: '12px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    cursor: isScanning ? 'wait' : 'pointer', fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
             >
                {isScanning ? '⏳ Analyserar...' : '📷 Välj bild / Skanna lista'}
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
                    padding:'5px', fontSize:'0.7rem', marginTop:'5px', border:'1px solid #ccc'
                }}>
                    <pre>{rawLog}</pre>
                </div>
            )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: '10px' }}>
          <button onClick={onClose} style={{ flex:1, background: "#ccc", color: "black" }}>Avbryt</button>
          <button onClick={handleImport} disabled={!text.trim()} style={{ flex:1, background: "green", color: "white" }}>Klar</button>
        </div>
      </div>
    </div>
  );
}