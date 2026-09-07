import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { VaultItem } from "@clyro/shared-types";

interface CredentialsFoundDetail {
  items: VaultItem[];
  field: HTMLInputElement;
}

const UI_CSS = `
  .clyro-overlay {
    position: fixed;
    z-index: 2147483647;
    font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif;
    color: #f8fafc;
    pointer-events: auto;
  }

  .clyro-dropdown {
    background: #1e293b;
    border: 1px solid #3b82f6;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    min-width: 220px;
    overflow: hidden;
    animation: fadeIn 0.2s ease-out;
  }

  .clyro-dropdown-item {
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #334155;
    transition: background-color 0.15s ease;
  }

  .clyro-dropdown-item:last-child {
    border-bottom: none;
  }

  .clyro-dropdown-item:hover {
    background-color: #334155;
  }

  .clyro-item-name {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .clyro-item-username {
    font-size: 12px;
    color: #94a3b8;
  }

  .clyro-banner {
    background: linear-gradient(135deg, #1e293b, #0f172a);
    border: 1px solid #60a5fa;
    border-radius: 12px;
    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.6);
    padding: 16px;
    min-width: 300px;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .clyro-banner-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
    background: linear-gradient(90deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .clyro-banner-text {
    font-size: 13px;
    color: #cbd5e1;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .clyro-banner-error {
    font-size: 12px;
    color: #ef4444;
    margin-top: -8px;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .clyro-banner-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .clyro-btn {
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .clyro-btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .clyro-btn-primary:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
  }

  .clyro-btn-secondary {
    background-color: transparent;
    color: #94a3b8;
    border: 1px solid #475569;
  }

  .clyro-btn-secondary:hover {
    background-color: #334155;
    color: #f8fafc;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

function AutofillUI() {
  const [options, setOptions] = useState<VaultItem[]>([]);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | null>(null);

  const [newCred, setNewCred] = useState<{
    url: string;
    username: string;
    password: string;
  } | null>(null);
  const [bannerField, setBannerField] = useState<HTMLInputElement | null>(null);
  const [bannerPos, setBannerPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // Covers a form submit that navigated away before it could show its own banner (see
    // detect.ts's handleFormSubmit): the credential survives in the background worker's
    // stash, and whichever page loads next claims it here. This runs directly in this
    // component's own mount effect — rather than detect.ts dispatching a clyro:new-credential-detected
    // event at content-script load time — because that event fires the instant the content
    // script loads, which can beat this component's very first mount (and thus its listener
    // registration further down): the round-trip to ask the background worker is often faster
    // than React committing the initial render. Setting state directly here has no such race.
    let cancelled = false;
    chrome.runtime
      .sendMessage({ type: "GET_PENDING_CREDENTIAL" })
      .then((response) => {
        if (cancelled || !response?.success || !response.data) return;
        const { url, username, password } = response.data as { url: string; username: string; password: string };
        setNewCred({ url, username, password });
        setBannerField(null);
        setBannerPos({ top: 20, left: window.innerWidth - 340 });
      })
      .catch(() => {
        // Best-effort — nothing to show if the background worker can't be reached.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePositions = () => {
    if (activeInput && options.length > 0) {
      const rect = activeInput.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    if (newCred) {
      if (bannerField && document.contains(bannerField)) {
        const rect = bannerField.getBoundingClientRect();
        setBannerPos({ top: rect.bottom + 8, left: rect.left });
      } else {
        setBannerPos({ top: 20, left: window.innerWidth - 340 });
      }
    }
  };

  useEffect(() => {
    // Field comes from the dispatching content-script, not document.activeElement:
    // the FIND_MATCHING_CREDENTIALS round-trip is async, so activeElement can have
    // drifted (user tabbed/clicked away) by the time this listener runs.
    const onFound = (e: Event) => {
      const { items, field } = (e as CustomEvent<CredentialsFoundDetail>).detail;
      if (!items || items.length === 0) return;

      setOptions(items);
      setActiveInput(field);

      const rect = field.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    };

    const handleClickOutside = (e: MouseEvent) => {
      // If we click outside the dropdown, close it
      // The event is on document, so if it reaches here and we didn't click inside shadow DOM, close.
      // But shadow DOM events are retargeted to the host.
      const hostEl = document.getElementById("clyro-autofill-host");
      if (e.target !== hostEl) {
        setOptions([]);
        setActiveInput(null);
      }
    };

    window.addEventListener("clyro:credentials-found", onFound);
    window.addEventListener("scroll", updatePositions, true);
    window.addEventListener("resize", updatePositions, true);
    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("clyro:credentials-found", onFound);
      window.removeEventListener("scroll", updatePositions, true);
      window.removeEventListener("resize", updatePositions, true);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeInput, options.length, newCred, bannerField]);

  const fillCredential = (item: VaultItem) => {
    if (!activeInput) return;

    const scope = activeInput.form ?? document;

    const passFields = Array.from(
      scope.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    );
    const pwdField =
      activeInput.type === "password" ? activeInput : (passFields[0] ?? null);

    const textFields = Array.from(
      scope.querySelectorAll<HTMLInputElement>("input"),
    ).filter((input) => {
      const type = input.type.toLowerCase();
      return type === "text" || type === "email" || type === "tel";
    });

    let userField = activeInput.type !== "password" ? activeInput : null;
    if (!userField && pwdField) {
      const allInputs = Array.from(scope.querySelectorAll("input"));
      const pwdIndex = allInputs.indexOf(pwdField);
      userField =
        textFields
          .slice()
          .reverse()
          .find((t) => allInputs.indexOf(t) < pwdIndex) || textFields[0];
    }
    if (!userField) userField = textFields[0];

    if (userField && item.username) {
      userField.value = item.username;
      userField.dispatchEvent(new Event("input", { bubbles: true }));
      userField.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (pwdField && item.password) {
      pwdField.value = item.password;
      pwdField.dispatchEvent(new Event("input", { bubbles: true }));
      pwdField.dispatchEvent(new Event("change", { bubbles: true }));
    }

    setOptions([]);
    setActiveInput(null);
  };

  const handleSave = async () => {
    if (!newCred) return;
    setSaveError(null);
    try {
      const res = await chrome.runtime.sendMessage({
        type: "SAVE_NEW_CREDENTIAL",
        item: {
          name: newCred.url,
          url: newCred.url,
          username: newCred.username,
          password: newCred.password,
        },
      });
      if (!res?.success) {
        // Keep the banner open on failure (e.g. the vault is locked) instead of silently
        // discarding the credential the user just asked to save — nothing else tells them
        // it didn't work. The credential itself already lives in this component's own state
        // (not re-fetched from the background worker's one-shot stash), so it's safe to
        // retry Save again after they've addressed the problem (e.g. unlocking the vault).
        setSaveError(res?.error?.message || "Failed to save credential.");
        return;
      }
    } catch {
      setSaveError("Failed to save credential.");
      return;
    }
    setNewCred(null);
  };

  return (
    <>
      {options.length > 0 && dropdownPos && (
        <div
          className="clyro-overlay clyro-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {options.map((item, idx) => (
            <div
              key={item.id || idx}
              className="clyro-dropdown-item"
              onClick={() => fillCredential(item)}
            >
              <div className="clyro-item-name">{item.name || item.url}</div>
              <div className="clyro-item-username">{item.username}</div>
            </div>
          ))}
        </div>
      )}

      {newCred && bannerPos && (
        <div
          className="clyro-overlay clyro-banner"
          style={{ top: bannerPos.top, left: bannerPos.left }}
        >
          <div className="clyro-banner-title">Save Password?</div>
          <div className="clyro-banner-text">
            Do you want to save this password for <strong>{newCred.url}</strong>
            ?
          </div>
          {saveError && <div className="clyro-banner-error">{saveError}</div>}
          <div className="clyro-banner-actions">
            <button
              className="clyro-btn clyro-btn-secondary"
              onClick={() => {
                setNewCred(null);
                setSaveError(null);
              }}
            >
              Ignore
            </button>
            <button
              className="clyro-btn clyro-btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Ensure we only mount once
if (!document.getElementById("clyro-autofill-host")) {
  const host = document.createElement("div");
  host.id = "clyro-autofill-host";
  // Use a very high z-index and absolute positioning to avoid affecting page layout
  host.style.position = "absolute";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "100%";
  host.style.height = "0";
  host.style.overflow = "visible";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = UI_CSS;
  shadow.appendChild(style);

  const rootDiv = document.createElement("div");
  // Re-enable pointer events for the React root so we can interact with dropdown
  rootDiv.style.pointerEvents = "none";
  shadow.appendChild(rootDiv);

  const root = createRoot(rootDiv);
  root.render(<AutofillUI />);
}
