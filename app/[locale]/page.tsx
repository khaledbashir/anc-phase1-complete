// Components
import { ProposalMain } from "@/app/components";
import CommanderChat from "@/app/components/CommanderChat";

export default function Home() {
    return (
        <main className="py-10 lg:container">
            <div className="flex gap-6">
                <CommanderChat />
                <div className="flex-1">
                    <ProposalMain />
                </div>
            </div>
        </main>
    );
}
