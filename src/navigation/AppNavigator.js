import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import ChatListScreen from '../screens/ChatListScreen';
import UserListScreen from '../screens/UserListScreen';
import ChatScreen from '../screens/ChatScreen';
import TermsScreen from '../screens/TermsScreen';
import { AuthContext } from '../context/AuthContext';

const Stack = createStackNavigator();

export default function AppNavigator() {
	const { user } = useContext(AuthContext);

	return (
		<NavigationContainer>
			<Stack.Navigator 
				screenOptions={{ 
					headerShown: false,
					// 웹에서 애니메이션 비활성화
					...(Platform.OS === 'web' && {
						animationEnabled: false,
						cardStyle: { backgroundColor: 'white' }
					})
				}}
			>
				{user ? (
					<>
						<Stack.Screen name="ChatList" component={ChatListScreen} />
						<Stack.Screen name="UserList" component={UserListScreen} />
						<Stack.Screen name="Chat" component={ChatScreen} />
					</>
				) : (
					<>
						<Stack.Screen name="Login" component={LoginScreen} />
						<Stack.Screen 
							name="Terms" 
							component={TermsScreen}
							options={{ 
								headerShown: true,
								title: 'Terms of Service',
								headerBackTitle: 'Back'
							}}
						/>
					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
}
