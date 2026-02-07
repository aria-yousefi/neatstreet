import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedScreen from "./src/screens/FeedScreen";
import ReportDetailScreen from "./src/screens/ReportDetailScreen";
import ReportCameraScreen from "./src/screens/ReportCameraScreen";
import CreateReportScreen from "./src/screens/CreateReportScreen";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Feed" component={FeedScreen} options={{ title: "NeatStreet" }} />
        <Stack.Screen
          name="ReportDetail"
          component={ReportDetailScreen}
          options={{ title: "Report Details" }}
        />
        <Stack.Screen name="ReportCamera" component={ReportCameraScreen} options={{ title: "Take Photo" }} />
        <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: "Create Report" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
