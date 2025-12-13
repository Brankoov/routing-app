import { useState } from "react";

type Props = {
  onImport: (addresses: string[]) => void;
  onClose: () => void;
};

export function BulkImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState("");

  const handleImport = () => {
    // 1. Dela upp texten vid varje ny rad (\n)
    // 2. Ta bort tomma rader och mellanslag
    const addresses = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (addresses.length > 0) {
      onImport(addresses);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="card" style={{ width: "90%", maxWidth: "400px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>📋 Klistra in adresser</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>
            ×
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.5rem" }}>
          Klistra in din lista här. En adress per rad.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Kungsgatan 1, Stockholm\nSveavägen 20, Stockholm\n..."}
          rows={10}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: "1rem"
          }}
        />

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#eee", color: "#333" }}>
            Avbryt
          </button>
          <button onClick={handleImport} className="primary-btn" style={{ width: "auto" }}>
            Importera {text.split('\n').filter(l => l.trim()).length > 0 ? `(${text.split('\n').filter(l => l.trim()).length} st)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}