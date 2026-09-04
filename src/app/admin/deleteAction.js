const TRASH_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16"></path>
    <path d="M9 7V4h6v3"></path>
    <path d="M18 7l-1 13H7L6 7"></path>
    <path d="M10 11v5M14 11v5"></path>
  </svg>
`;

export function createTrashButton({ label, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "trash-button";
  button.innerHTML = TRASH_ICON;
  button.setAttribute("aria-label", label);
  button.title = "영구 삭제";
  button.addEventListener("click", onClick);
  return button;
}
