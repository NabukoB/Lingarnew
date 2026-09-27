import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Mtandao" };

export default function LoginPage({ searchParams }: { searchParams: { expired?: string } }) {
  return <LoginForm expired={searchParams.expired === "1"} />;
}
