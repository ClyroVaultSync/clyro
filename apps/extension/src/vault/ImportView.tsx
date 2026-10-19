import React, { useState } from "react";
import type { VaultItem } from "@clyro/shared-types";
import InteractiveHoverButton from "../popup/InteractiveHoverButton";
import { ArrowLeftIcon } from "./VaultIcons";
import { buttonRowStyle, panelStyle } from "./CredentialForm";
import { decodeCsvFile, planImport, type ImportPlan } from "./csvImport";

interface Props {
  /** The vault's current items, so logins it already holds aren't imported twice. */
  existingItems: VaultItem[];
  saving: boolean;
  /** Saves the new items and resolves to whether that worked. VaultList shows any error. */
  onImport: (items: VaultItem[]) => Promise<boolean>;
  onClose: () => void;
}

/** Far larger than any real password export; stops a wrong file from freezing the page. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SUPPORTED_MANAGERS =
  "Dashlane, Chrome, Edge, Brave, Firefox, Safari, Bitwarden, LastPass, 1Password, Proton Pass, KeePassXC and RoboForm";

/**
 * Imports logins from another password manager's CSV export. The file is read
 * here, inside the extension, and leaves only as encrypted vault items through
 * the normal save: it's never uploaded, stored or logged. The parsed logins live
 * in this component's state and are gone when it unmounts, including on lock.
 */
export default function ImportView({ existingItems, saving, onImport, onClose }: Props) {
  const [fileName, setFileName] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [problem, setProblem] = useState("");
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleFile = async (file: File | undefined) => {
    setPlan(null);
    setProblem("");
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setProblem("That file is too large to be a password export.");
      return;
    }
    const decoded = decodeCsvFile(new Uint8Array(await file.arrayBuffer()));
    if ("error" in decoded) {
      setProblem(decoded.error);
      return;
    }
    const result = planImport(decoded.text, existingItems, new Date().toISOString());
    if ("error" in result) setProblem(result.error);
    else setPlan(result);
  };

  const handleImport = async () => {
    if (!plan) return;
    if (await onImport(plan.items)) {
      setImportedCount(plan.items.length);
      setPlan(null);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <button
          type="button"
          className="vault-icon-btn"
          onClick={onClose}
          disabled={saving}
          title="Back to vault"
          style={{ flexShrink: 0 }}
        >
          <ArrowLeftIcon size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: "16px", color: "#f5f3f1" }}>Import Passwords</h2>
      </div>

      {importedCount !== null ? (
        <>
          <p style={textStyle}>{`Imported ${countOf(importedCount, "login")}.`}</p>
          <div style={warningStyle}>
            {`Now delete ${fileName} from your computer and empty the Recycle Bin. It still holds every password in plain text; only the copy in your vault is encrypted.`}
          </div>
          <div style={{ marginTop: "8px" }}>
            <InteractiveHoverButton onClick={onClose}>Back to vault</InteractiveHoverButton>
          </div>
        </>
      ) : (
        <>
          <p style={textStyle}>
            Moving from another password manager? Export your passwords from it as a CSV file, then choose that file
            here. Works with {SUPPORTED_MANAGERS}.
          </p>
          <p style={mutedStyle}>
            The file is read on this device only. It&apos;s never uploaded anywhere, and its logins are encrypted into
            your vault like any other.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={saving}
            style={{ color: "#f5f3f1", fontSize: "13px" }}
          />
          {problem && <div style={problemStyle}>{problem}</div>}
          {plan && <ImportSummary plan={plan} fileName={fileName} />}
          <div style={{ ...buttonRowStyle, marginTop: "8px" }}>
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton onClick={onClose} disabled={saving}>
                Cancel
              </InteractiveHoverButton>
            </div>
            <div style={{ flex: 1 }}>
              <InteractiveHoverButton onClick={handleImport} disabled={saving || !plan || plan.items.length === 0}>
                {saving ? "Importing..." : plan ? `Import ${countOf(plan.items.length, "login")}` : "Import"}
              </InteractiveHoverButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** What the chosen file holds, shown before anything is saved. */
function ImportSummary({ plan, fileName }: { plan: ImportPlan; fileName: string }) {
  const details = [
    plan.skippedNoPassword > 0 &&
      `${countOf(plan.skippedNoPassword, "entry", "entries")} skipped: no password (secure notes, cards or empty logins).`,
    plan.duplicates > 0 && `${countOf(plan.duplicates, "duplicate")} skipped: already in your vault or listed twice.`,
    plan.withoutWebsite > 0 &&
      `${countOf(plan.withoutWebsite, "login")} without a website address won't autofill until you add one.`,
    plan.otpKept > 0 &&
      `${countOf(plan.otpKept, "2FA setup key")} kept in the login's notes, since Clyro can't generate 2FA codes yet.`,
  ].filter((detail): detail is string => Boolean(detail));

  return (
    <div style={summaryStyle}>
      <div style={{ fontSize: "13px", color: "#f5f3f1" }}>
        {plan.items.length > 0
          ? `${countOf(plan.items.length, "login")} ready to import from ${fileName}.`
          : `Nothing new to import from ${fileName}.`}
      </div>
      {details.length > 0 && (
        <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px", color: "#a39c97", lineHeight: 1.6 }}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const textStyle = { margin: 0, fontSize: "13px", color: "#f5f3f1", lineHeight: 1.5 };

const mutedStyle = { margin: 0, fontSize: "12px", color: "#a39c97", lineHeight: 1.5 };

const summaryStyle = {
  background: "#120d0c",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "8px",
  padding: "10px 12px",
};

// Same red as VaultList's error banner.
const problemStyle = {
  background: "rgba(239, 68, 68, 0.1)",
  color: "#ef4444",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  padding: "10px 12px",
  borderRadius: "8px",
  fontSize: "12px",
};

// Red-bordered but not an error: the import worked, and the plaintext file it came from is still on disk.
const warningStyle = {
  background: "#120d0c",
  color: "#f5f3f1",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  padding: "10px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  lineHeight: 1.5,
};
