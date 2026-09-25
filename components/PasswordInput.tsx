"use client";

import { useState } from "react";

export function PasswordInput(props: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className="input pr-20" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="absolute inset-y-1 right-1 rounded-md px-3 text-sm font-medium text-stone-600 hover:bg-stone-100"
      >
        {visible ? "Sakrij" : "Prikaži"}
      </button>
    </div>
  );
}
