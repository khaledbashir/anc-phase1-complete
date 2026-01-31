"use client";

import { useState } from "react";
import { Upload, CheckCircle, AlertTriangle, Loader2, Globe, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AIBrowserTestPage() {
	const [file, setFile] = useState<File | null>(null);
	const [visionLoading, setVisionLoading] = useState(false);
	const [visionResults, setVisionResults] = useState<any[]>([]);
	const [visionError, setVisionError] = useState<string | null>(null);
	const [preview, setPreview] = useState<string | null>(null);

	const [browserlessLoading, setBrowserlessLoading] = useState(false);
	const [browserlessOk, setBrowserlessOk] = useState<boolean | null>(null);
	const [browserlessError, setBrowserlessError] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const selected = e.target.files[0];
			setFile(selected);
			setPreview(URL.createObjectURL(selected));
			setVisionResults([]);
			setVisionError(null);
		}
	};

	const runVisionTest = async () => {
		if (!file) return;
		setVisionLoading(true);
		setVisionError(null);
		const formData = new FormData();
		formData.append("file", file);
		try {
			const res = await fetch("/api/vision/analyze", { method: "POST", body: formData });
			const data = await res.json();
			if (data.success) {
				setVisionResults(data.results ?? []);
			} else {
				setVisionError(data.error || "Vision API error");
			}
		} catch (e) {
			setVisionError("Failed to analyze image");
		} finally {
			setVisionLoading(false);
		}
	};

	const runBrowserlessTest = async () => {
		setBrowserlessLoading(true);
		setBrowserlessOk(null);
		setBrowserlessError(null);
		try {
			const res = await fetch("/api/test/browserless");
			const data = await res.json();
			if (data.ok) {
				setBrowserlessOk(true);
			} else {
				setBrowserlessOk(false);
				setBrowserlessError(data.error || "Connection failed");
			}
		} catch (e) {
			setBrowserlessOk(false);
			setBrowserlessError("Request failed");
		} finally {
			setBrowserlessLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-200 p-8">
			<div className="max-w-4xl mx-auto space-y-8">
				<header className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight text-white">
						AI Browser Test
					</h1>
					<p className="text-zinc-400">
						Test Vision (Z AI) and Browserless (PDF) connectivity. Open this page in the browser to verify integrations.
					</p>
				</header>

				{/* Browserless connectivity */}
				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-white">
							<Globe className="w-5 h-5" style={{ color: "#0A52EF" }} />
							Browserless (PDF)
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							onClick={runBrowserlessTest}
							disabled={browserlessLoading}
							className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white"
						>
							{browserlessLoading ? (
								<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing…</>
							) : (
								"Test Browserless connection"
							)}
						</Button>
						{browserlessOk === true && (
							<div className="flex items-center gap-2 text-green-400 text-sm">
								<CheckCircle className="w-4 h-4" /> Browserless connected.
							</div>
						)}
						{browserlessOk === false && browserlessError && (
							<div className="text-red-400 text-sm">{browserlessError}</div>
						)}
					</CardContent>
				</Card>

				{/* Vision (Z AI) test */}
				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-white">
							<ImageIcon className="w-5 h-5" style={{ color: "#0A52EF" }} />
							Vision (Z AI)
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<label className="block border-2 border-dashed border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer hover:border-zinc-600 transition-colors">
							{preview ? (
								<img src={preview} alt="Preview" className="max-h-48 object-contain rounded" />
							) : (
								<div className="flex flex-col items-center text-zinc-500">
									<Upload className="h-10 w-10 mb-2" />
									<p className="text-sm">Choose an image to test extraction</p>
								</div>
							)}
							<input
								type="file"
								accept="image/*"
								className="sr-only"
								onChange={handleFileChange}
							/>
						</label>
						<Button
							onClick={runVisionTest}
							disabled={!file || visionLoading}
							className="w-full bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white"
						>
							{visionLoading ? (
								<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
							) : (
								"Run Vision extraction"
							)}
						</Button>
						{visionError && (
							<div className="text-red-400 text-sm">{visionError}</div>
						)}
						<div className="space-y-3">
							{visionResults.map((item: any, idx: number) => (
								<div
									key={idx}
									className={`p-4 rounded border ${
										item.needsVerification
											? "bg-[#0A52EF]/10 border-[#0A52EF]/50"
											: "bg-green-900/10 border-green-500/30"
									}`}
								>
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs text-zinc-400 uppercase tracking-wider">{item.field}</p>
											<p className="font-mono text-white">{String(item.value)}</p>
										</div>
										{item.needsVerification ? (
											<span className="flex items-center text-[#0A52EF] text-xs font-bold">
												<AlertTriangle className="w-3 h-3 mr-1" /> Verify ({Math.round((item.confidence ?? 0) * 100)}%)
											</span>
										) : (
											<span className="flex items-center text-green-400 text-xs">
												<CheckCircle className="w-3 h-3 mr-1" /> Verified
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
