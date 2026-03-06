import { DineUpExperience } from "@/components/dineup-experience";
import { restaurants } from "@/lib/restaurants";

export default function Home() {
  return <DineUpExperience restaurants={restaurants} />;
}
