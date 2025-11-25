import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

const TermsScreen = ({ navigation, route }) => {
  const [agreed, setAgreed] = useState(false);
  const { onAccept } = route.params || {};

  const handleAccept = () => {
    if (!agreed) {
      Alert.alert('Error', 'Please agree to the Terms of Service to continue.');
      return;
    }
    if (onAccept) {
      onAccept();
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: November 25, 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.text}>
          By creating an account and using ENJP Bridge, you agree to comply with these Terms of Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Prohibited Content</Text>
        <Text style={styles.text}>
          Users must not post, share, or transmit any content that is:
        </Text>
        <Text style={styles.bullet}>• Harassing, threatening, or abusive</Text>
        <Text style={styles.bullet}>• Hateful, discriminatory, or promoting violence</Text>
        <Text style={styles.bullet}>• Sexually explicit or inappropriate</Text>
        <Text style={styles.bullet}>• Spam or advertising</Text>
        <Text style={styles.bullet}>• Illegal or promotes illegal activities</Text>
        <Text style={styles.bullet}>• Violates intellectual property rights</Text>

        <Text style={styles.sectionTitle}>3. User Conduct</Text>
        <Text style={styles.text}>
          Users must:
        </Text>
        <Text style={styles.bullet}>• Treat other users with respect</Text>
        <Text style={styles.bullet}>• Use the app for its intended purpose (language exchange)</Text>
        <Text style={styles.bullet}>• Not impersonate others</Text>
        <Text style={styles.bullet}>• Be cautious when sharing personal information</Text>
        <Text style={styles.bullet}>• Not attempt to hack or disrupt the service</Text>

        <Text style={styles.sectionTitle}>4. Content Moderation</Text>
        <Text style={styles.text}>
          We reserve the right to:
        </Text>
        <Text style={styles.bullet}>• Monitor and review user content</Text>
        <Text style={styles.bullet}>• Remove objectionable content immediately</Text>
        <Text style={styles.bullet}>• Suspend or terminate accounts that violate these terms</Text>

        <Text style={styles.sectionTitle}>5. Reporting and Blocking</Text>
        <Text style={styles.text}>
          Users can:
        </Text>
        <Text style={styles.bullet}>• Report inappropriate content or behavior</Text>
        <Text style={styles.bullet}>• Block users to prevent further communication</Text>
        <Text style={styles.bullet}>• Contact us at jihun.jo@yahoo.com for urgent issues</Text>
        <Text style={styles.text}>
          We are committed to reviewing all reports within 24 hours and taking appropriate action, including removing objectionable content and suspending or terminating accounts of users who violate these terms.
        </Text>

        <Text style={styles.sectionTitle}>6. Consequences of Violations</Text>
        <Text style={styles.text}>
          Violations may result in:
        </Text>
        <Text style={styles.bullet}>• Warning from moderators</Text>
        <Text style={styles.bullet}>• Account suspension or ban</Text>
        <Text style={styles.bullet}>• Account termination for serious violations</Text>
        <Text style={styles.bullet}>• Legal action if necessary</Text>

        <Text style={styles.sectionTitle}>7. Contact</Text>
        <Text style={styles.text}>
          For questions or concerns, contact us at: jihun.jo@yahoo.com
        </Text>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAgreed(!agreed)}
        >
          <View style={[styles.checkboxBox, agreed && styles.checkboxBoxChecked]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the Terms of Service
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !agreed && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={!agreed}
        >
          <Text style={styles.buttonText}>Accept and Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2196F3',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginLeft: 10,
    marginBottom: 5,
  },
  spacer: {
    height: 100,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#2196F3',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsScreen;
