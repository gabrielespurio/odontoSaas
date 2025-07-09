import { createRoot } from "react-dom/client";

function SimpleApp() {
  return <div>Simple React App Works!</div>;
}

createRoot(document.getElementById("root")!).render(<SimpleApp />);