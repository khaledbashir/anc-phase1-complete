"use client";

import { useState } from "react";

export default function ShareChangeRequestForm({ shareHash }: { shareHash: string }) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/share/${shareHash}/request`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, message }),
			});
			const text = await res.text();
			let json: any = null;
			try {
				json = text ? JSON.parse(text) : null;
			} catch {
				json = null;
			}
			if (!res.ok) {
				const msg = json?.error || text || "Request failed";
				const details = json?.details;
				throw new Error(details ? `${msg}: ${details}` : msg);
			}
			setSent(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Request failed");
		} finally {
			setLoading(false);
		}
	};

	if (sent) {
		return (
			<div className="mt-10 w-full max-w-[850px] rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-emerald-800">
				<div className="text-xs font-bold uppercase tracking-widest">Request Submitted</div>
				<div className="mt-2 text-sm font-medium">ANC received your change request.</div>
			</div>
		);
	}

	return (
		<div className="mt-10 w-full max-w-[850px] rounded-2xl border border-slate-200 bg-white px-6 py-5">
			<div className="text-xs font-bold uppercase tracking-widest text-slate-500">
				Request Changes
			</div>
			<div className="mt-1 text-sm font-semibold text-slate-900">
				Send feedback to the proposal team
			</div>

			<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
						Name
					</div>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						placeholder="Your name"
					/>
				</div>
				<div>
					<div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
						Email (optional)
					</div>
					<input
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						placeholder="you@company.com"
					/>
				</div>
			</div>

			<div className="mt-4">
				<div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
					What should change?
				</div>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					className="mt-2 w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
					placeholder="Example: Change North Upper to North Ribbon; adjust quantity to 2; update legal address…"
				/>
			</div>

			{error && (
				<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<button
				type="button"
				onClick={submit}
				disabled={loading || !name.trim() || !message.trim()}
				className="mt-5 inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
			>
				{loading ? "Sending…" : "Submit Request"}
			</button>
		</div>
	);
}
