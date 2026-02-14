import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RateCardAdmin from "./RateCardAdmin";

export default async function AdminRateCardPage() {
    const session = await auth();
    if (session?.user?.authRole !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-normal text-foreground serif-vault">
                        Rate Card
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Single source of truth for estimation constants. Edit inline, upload CSV, or add new entries.
                    </p>
                </div>
                <RateCardAdmin />
            </div>
        </div>
    );
}
