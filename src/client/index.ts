import { attachComponent, createElement } from "veles";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Client root #app was not found");
}

attachComponent({
  htmlElement: root,
  component: createElement(App),
});
