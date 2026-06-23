import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/constructpro-app.css";
import "./styles/global-masters.css";

// Set the page title
document.title = "ConstructPro - Project Management";

createRoot(document.getElementById("root")!).render(<App />);
