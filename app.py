# app.py
import os, time, io, re, textwrap
from typing import List, Tuple, Dict

import requests
import pandas as pd
import streamlit as st
from html import escape

st.set_page_config(page_title="RPA自動化 — 電通データアーティストモンゴル", layout="wide")

# =========================
# CONFIG (edit these)
# =========================
SHEET_ID = "1zLx-1OSUnytTQPK4CQDssSAc2Nt7UrUZOjOBGHDW7H4"
INDEX_SHEET = "Index"
FORCE_INDEX_COL = None      # 0 = column A, 1 = column B, ... ; or None to auto-detect
TIMEOUT = 30
PREVIEW_TRUNCATE_COLS = {"script", "code"}  # columns to truncate in preview table

# =========================
# PASSWORD-ONLY LOGIN
# =========================
SECRET = st.secrets.get("APP_PASSWORD", os.getenv("APP_PASSWORD", ""))

if "authed" not in st.session_state:
    st.session_state.authed = False

def login_ui():
    st.title("Functions Library")
    st.caption("Password required")
    pwd = st.text_input("Password", type="password")
    if st.button("Enter", type="primary"):
        if SECRET and pwd == SECRET:
            st.session_state.authed = True
            st.rerun()
        else:
            st.error("Invalid password")
    st.stop()

if not SECRET:
    st.warning("No APP_PASSWORD set. Add `APP_PASSWORD` in Streamlit Secrets or environment to require login.")
else:
    if not st.session_state.authed:
        login_ui()

# =========================
# CACHE-BUST / REFRESH
# =========================
if "cache_bust" not in st.session_state:
    st.session_state.cache_bust = ""

def csv_url(sheet_name: str) -> str:
    base = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={requests.utils.quote(sheet_name)}"
    return f"{base}&cb={st.session_state.cache_bust}" if st.session_state.cache_bust else base

@st.cache_data(show_spinner=False, ttl=60)
def fetch_csv(sheet_name: str, header: bool = True) -> pd.DataFrame:
    """Fetch a sheet as CSV -> DataFrame."""
    r = requests.get(csv_url(sheet_name), timeout=TIMEOUT)
    r.raise_for_status()
    content = r.content
    if header:
        return pd.read_csv(io.BytesIO(content))
    return pd.read_csv(io.BytesIO(content), header=None)

def normalize_header(s: str) -> str:
    return (
        str(s or "")
        .replace("\ufeff", "")
        .replace("\u200b", "")
        .strip()
        .lower()
    )

def index_pick_column(df_no_header: pd.DataFrame) -> int:
    """Choose which column in Index to read names from."""
    if FORCE_INDEX_COL is not None:
        return int(FORCE_INDEX_COL)
    if df_no_header.empty:
        return -1
    width = df_no_header.shape[1]
    for c in range(width):
        col_vals = df_no_header.iloc[1:, c].astype(str).fillna("").map(lambda x: x.replace("\ufeff","").strip())
        if (col_vals != "").any():
            return c
    return -1

def get_index_titles() -> List[str]:
    """Read Index tab (no headers), grab names from row 2↓ in chosen column."""
    df = fetch_csv(INDEX_SHEET, header=False)
    if df.empty:
        raise RuntimeError("INDEX_EMPTY_SHEET")
    col_idx = index_pick_column(df)
    if col_idx < 0:
        raise RuntimeError("INDEX_NO_USABLE_COLUMN")
    names = (
        df.iloc[1:, col_idx]
        .astype(str)
        .map(lambda x: x.replace("\ufeff","").strip())
    )
    names = [n for n in names if n]
    if not names:
        raise RuntimeError("INDEX_ONLY_HEADER_NO_ROWS")
    return names

def map_columns(df: pd.DataFrame) -> Tuple[List[Dict], List[str]]:
    """
    Map flexible headers:
      Step_ID: 'step_id','step id','step','ステップ'
      Section: 'section','セクション'
      Description: 'description','説明'
      Script/Code: 'script','code'
      Image/HTML: 'image','画像','html'
      Option1/Option2: 'option1','option 1','オプション1' / 'option2','option 2','オプション2'
    Return: (mapped_rows, original_headers_list)
    """
    if df.empty:
        return [], []

    headers = list(df.columns)
    norm_map = {h: normalize_header(h) for h in headers}

    step_key   = next((h for h in headers if norm_map[h] in ("step_id","step id","step","ステップ")), None)
    section_key= next((h for h in headers if norm_map[h] in ("section","セクション")), None)
    desc_key   = next((h for h in headers if norm_map[h] in ("description","説明")), None)
    code_key   = next((h for h in headers if norm_map[h] in ("script","code")), None)
    image_key  = next((h for h in headers if norm_map[h] in ("image","画像","html")), None)
    opt1_key   = next((h for h in headers if norm_map[h] in ("option1","option 1","オプション1")), None)
    opt2_key   = next((h for h in headers if norm_map[h] in ("option2","option 2","オプション2")), None)

    rows: List[Dict] = []
    for _, row in df.iterrows():
        def sget(key):
            if key is None: return ""
            val = row.get(key, "")
            return "" if pd.isna(val) else str(val)

        item = {
            "step": sget(step_key),
            "section": sget(section_key),
            "opt1": sget(opt1_key),
            "opt2": sget(opt2_key),
            "desc": sget(desc_key),
            "code": sget(code_key),
            "imageHtml": sget(image_key),
        }
        if any(item.values()):
            rows.append(item)

    return rows, headers

@st.cache_data(show_spinner=False, ttl=60)
def load_tab(sheet_name: str, cb: str) -> Tuple[List[Dict], pd.DataFrame, List[str]]:
    """Return (mapped_rows, raw_df, headers) for a tab. `cb` is here to key cache-busting."""
    df_raw = fetch_csv(sheet_name, header=True)
    mapped, headers = map_columns(df_raw)
    return mapped, df_raw, headers

def truncate_preview_df(df: pd.DataFrame, max_len=120) -> pd.DataFrame:
    """Truncate very long text in preview for nicer row height."""
    show = df.copy()
    # Try to truncate likely long columns first
    cols = list(show.columns)
    lower = {c: normalize_header(c) for c in cols}
    target_cols = [c for c in cols if lower[c] in PREVIEW_TRUNCATE_COLS]
    for c in target_cols:
        show[c] = show[c].astype(str).map(lambda s: s if len(s) <= max_len else (s[:max_len-1] + "…"))
    return show

# =========================
# UI Header / Controls
# =========================
hdr_left, hdr_mid, hdr_right = st.columns([1,1,1], gap="small")
with hdr_left:
    st.subheader("Functions Library")
    st.caption("Auto-loaded from Google Sheets (Index-only)")

with hdr_mid:
    if st.button("Open Preview", use_container_width=True):
        st.session_state["scroll_preview"] = True

with hdr_right:
    if st.button("Refresh", use_container_width=True):
        st.session_state.cache_bust = str(time.time())
        fetch_csv.clear()
        load_tab.clear()
        st.rerun()

# Titles from Index
try:
    titles = get_index_titles()
except Exception:
    st.error(
        "Couldn't read tab list from the 'Index' sheet. "
        "Make sure it exists and has names from row 2 downward (any column)."
    )
    st.stop()

if not titles:
    st.warning("No sheets found in Index.")
    st.stop()

# Tabs per sheet
tabs = st.tabs(titles)

# =========================
# Per-tab content
# =========================
for i, sheet_name in enumerate(titles):
    with tabs[i]:
        st.markdown(f"### {sheet_name}")

        with st.spinner(f"Loading: {sheet_name}…"):
            mapped_rows, raw_df, raw_headers = load_tab(sheet_name, st.session_state.cache_bust)

        # Search (current sheet only)
        q = st.text_input(
            "Search (Step_ID / Section / Description) — current sheet",
            key=f"search_{i}",
            placeholder="Type to filter… (partial text OK)",
        ).strip().lower()

        def match_row(r: Dict) -> bool:
            if not q: return True
            return (
                (r.get("step","").lower().find(q) >= 0) or
                (r.get("section","").lower().find(q) >= 0) or
                (r.get("desc","").lower().find(q) >= 0)
            )

        filtered = [r for r in mapped_rows if match_row(r)]
        st.caption(f"Showing {len(filtered)}/{len(mapped_rows)} items")

        # Function cards
        for idx, r in enumerate(filtered):
            with st.container(border=True):
                # Badges line (Section, Option1, Option2)
                def badge(text, border, bg, color):
                    return f"""<span style="
                        display:inline-flex;align-items:center;padding:2px 8px;border-radius:9999px;
                        font-size:11px;border:1px solid {border};background:{bg};color:{color};">{escape(text)}</span>"""

                badges = []
                if r.get("section"):
                    badges.append(badge(r["section"], "#F5D0FE", "linear-gradient(135deg,#FEF3FF,#F0F9FF)", "#A21CAF"))
                if r.get("opt1"):
                    badges.append(badge(r["opt1"], "#BAE6FD", "linear-gradient(135deg,#F0F9FF,#EEF2FF)", "#0369A1"))
                if r.get("opt2"):
                    badges.append(badge(r["opt2"], "#FDE68A", "linear-gradient(135deg,#FFF7ED,#FFF1F2)", "#B45309"))

                st.markdown(
                    f"""
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;">{"".join(badges)}</div>
                    <div style="font-weight:600;font-size:16px;line-height:1.2;margin-bottom:4px;color:#111827;">
                        {escape(r.get('step') or '(No Step_ID)')}
                    </div>
                    """,
                    unsafe_allow_html=True
                )

                # Buttons
                col_a, col_b, col_c = st.columns([1,1,1])
                key_prefix = f"row_{i}_{idx}"

                show_desc = col_a.button("説明", key=f"{key_prefix}_desc")
                show_code = col_b.button("Code", key=f"{key_prefix}_code")
                show_prev = col_c.button("Preview", key=f"{key_prefix}_prev")

                # Default per row
                if f"{key_prefix}_mode" not in st.session_state:
                    st.session_state[f"{key_prefix}_mode"] = "desc"
                if show_desc: st.session_state[f"{key_prefix}_mode"] = "desc"
                if show_code: st.session_state[f"{key_prefix}_mode"] = "code"
                if show_prev: st.session_state[f"{key_prefix}_mode"] = "prev"

                mode = st.session_state[f"{key_prefix}_mode"]

                if mode == "desc":
                    st.info(r.get("desc") or "(no Description)")

                elif mode == "code":
                    code_str = r.get("code") or ""
                    # Copy-to-clipboard widget
                    copy_html = textwrap.dedent(f"""
                    <div style="display:flex;gap:8px;align-items:center;margin:6px 0;">
                      <button id="btn_{key_prefix}" style="padding:6px 10px;border-radius:10px;border:1px solid #e5e7eb;cursor:pointer;">Copy code</button>
                      <span id="txt_{key_prefix}" style="font-size:12px;color:#6b7280;"></span>
                    </div>
                    <script>
                      const btn = document.getElementById("btn_{key_prefix}");
                      const txt = document.getElementById("txt_{key_prefix}");
                      if (btn) {{
                        btn.onclick = async () => {{
                          try {{
                            await navigator.clipboard.writeText({escape(code_str)!r});
                            txt.textContent = "Copied!";
                            setTimeout(()=>txt.textContent="", 1200);
                          }} catch (e) {{
                            txt.textContent = "Copy failed";
                          }}
                        }};
                      }}
                    </script>
                    """)
                    st.components.v1.html(copy_html, height=45)
                    st.code(code_str, language="python")  # or "text", switch if your script isn't Python

                else:  # preview (exec HTML)
                    html_snippet = r.get("imageHtml") or '<div style="padding:16px;font:14px system-ui;color:#444">(No 画像 HTML)</div>'
                    st.components.v1.html(html_snippet, height=320, scrolling=True)

        # ---- Preview (all rows of active sheet) ----
        st.divider()
        with st.expander("Preview (all rows of active sheet)", expanded=bool(st.session_state.get("scroll_preview"))):
            st.caption("Tip: use the Refresh button (top-right) to pull the latest rows.")
            df_show = truncate_preview_df(raw_df, max_len=120)
            st.dataframe(df_show, use_container_width=True)

        st.session_state["scroll_preview"] = False
