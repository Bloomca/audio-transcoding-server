import { attachComponent, createElement } from "veles";
import { App } from "./components/App";
import "./styles.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Client root #app was not found");
}

attachComponent({
  htmlElement: root,
  component: createElement(App),
});
