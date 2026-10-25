"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function FollowButton() {
  const t = useTranslations("Profile");
  const [on, setOn] = useState(false);

  return (
    <button className="ink-button" type="button" onClick={() => setOn(true)} aria-pressed={on}>
      {on ? t("following") : t("follow")}
    </button>
  );
}
