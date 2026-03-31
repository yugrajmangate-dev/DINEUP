import { DineUpExperience } from "@/components/dineup-experience";
import { listPlatformRestaurants } from "@/lib/platform-db";

export default async function Home() {
  const restaurants = await listPlatformRestaurants();
  return <DineUpExperience restaurants={restaurants} />;
}
