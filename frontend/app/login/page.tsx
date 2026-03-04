/*
  login/page.tsx — This is the login page that users see first.
  
  It's kept simple on purpose: there's no real password checking here.
  All we do is save the user's email to localStorage (the browser's built-in storage)
  and then send them straight to the dashboard.
  
  In a real production app, you'd connect this to a proper authentication service,
  but for this assessment it's enough to show the flow.
*/

"use client"; // This tells Next.js to run this component in the browser, not on the server

import { useState } from "react";
import { useRouter } from "next/navigation";

// These are pre-built UI components from shadcn/ui — a popular component library.
// They save us from writing loads of CSS from scratch.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LoginPage() {
    // We use "state" to keep track of what the user has typed into the email box.
    // Every time they type a letter, React updates this value automatically.
    const [email, setEmail] = useState("");

    // useRouter lets us send the user to a different page without reloading the whole site.
    const router = useRouter();

    // This function runs when the user clicks the "Sign In" button.
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault(); // Stop the browser from reloading the page (default form behaviour)

        // Save the email to localStorage so other pages can access it later.
        // localStorage is like a small notebook the browser keeps for our website.
        localStorage.setItem("user_email", email);

        // Send the user to the dashboard page.
        router.push("/dashboard");
    };

    return (
        // Centre the card both vertically and horizontally on the screen
        <div className="flex h-screen items-center justify-center bg-zinc-50">
            {/* The card is the white box that contains the form */}
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* The form collects the email and password, then calls handleLogin on submit */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Controlled input: the value always matches our "email" state */}
                        <Input
                            type="email"
                            placeholder="Email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {/* We collect the password but don't actually validate it in this version */}
                        <Input type="password" placeholder="Password" required />
                        <Button type="submit" className="w-full">Sign In</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}