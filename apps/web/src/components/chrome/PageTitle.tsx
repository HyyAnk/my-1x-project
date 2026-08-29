import React from "react";

export type PageTitleProps = {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
};

export function PageTitle({ eyebrow, title, copy, action }: PageTitleProps) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {copy ? <p className="page-copy">{copy}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
