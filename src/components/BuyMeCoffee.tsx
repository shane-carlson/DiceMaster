import { useEffect } from "react";

const SCRIPT_SRC = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
const SCRIPT_ID = "bmc-widget-script";

function removeWidget() {
  document.getElementById(SCRIPT_ID)?.remove();
  document.getElementById("bmc-wbtn")?.remove();
  document.querySelectorAll('iframe[src*="buymeacoffee"]').forEach((el) => el.remove());
}

/** Official Buy Me a Coffee floating widget (ShaneCarlson). */
export function BuyMeCoffee() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.setAttribute("data-name", "BMC-Widget");
    script.setAttribute("data-cfasync", "false");
    script.setAttribute("data-id", "ShaneCarlson");
    script.setAttribute("data-description", "Support me on Buy me a coffee!");
    script.setAttribute(
      "data-message",
      "If you find this valuable, feel free to buy me a coffee to support this work.\u00A0",
    );
    script.setAttribute("data-color", "#5F7FFF");
    script.setAttribute("data-position", "Right");
    script.setAttribute("data-x_margin", "18");
    script.setAttribute("data-y_margin", "18");
    document.body.appendChild(script);

    return () => {
      removeWidget();
    };
  }, []);

  return null;
}
