import { Slot } from 'expo-router';

export default function AuthLayout() {
  // This is the layout for the (auth) group. It does not need any special
  // logic, as the root layout `app/_layout.tsx` handles all the
  // authentication-based navigation.
  return <Slot />;
}
