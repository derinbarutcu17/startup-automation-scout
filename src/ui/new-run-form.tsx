"use client";

import { useActionState, useState } from "react";
import { createAndStartRunAction, type ActionState } from "@/src/application/web-actions";
import { Icon } from "@/src/ui/icons";

const initialState: ActionState = {};

export function NewRunForm() {
  const [seed, setSeed] = useState("");
  const [state, formAction, pending] = useActionState(createAndStartRunAction, initialState);
  return (
    <form className="new-run-form" action={formAction}>
      <label htmlFor="seed">Company URL</label>
      <div className="input-row"><input id="seed" name="seed" type="text" inputMode="url" autoComplete="url" placeholder="https://company.com" value={seed} onChange={(event) => setSeed(event.target.value)} required /><button className="button button-primary" type="submit" disabled={pending}><Icon name={pending ? "clock" : "arrow"} size={16} />{pending ? "Starting..." : "Research company"}</button></div>
      <div className="form-foot"><button className="fixture-link" type="button" onClick={() => setSeed("https://berlinflow.example")}><Icon name="spark" size={14} />Use BerlinFlow fixture</button><span>One bounded URL · Berlin / Germany profile · fixture-safe</span></div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}
