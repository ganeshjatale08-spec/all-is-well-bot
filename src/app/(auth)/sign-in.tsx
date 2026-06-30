import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { signInSchema, type SignInInput } from '../../schemas/auth';
import { useGoogleSignIn, useSignIn } from '../../features/auth/hooks/useAuth';

export default function SignIn() {
  const router = useRouter();
  const signIn = useSignIn();
  const googleSignIn = useGoogleSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    signIn.mutate(values);
  });

  return (
    <Screen scroll>
      <View className="flex-1 justify-center gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Welcome back</Text>
          <Text className="font-body text-base text-ink-muted">Sign in to continue.</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry
              />
            )}
          />
          {signIn.isError ? (
            <Text className="font-body-medium text-sm text-danger">
              {signIn.error instanceof Error ? signIn.error.message : 'Couldn’t sign in.'}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Button label="Sign in" onPress={onSubmit} loading={signIn.isPending} />
          <Button
            label="Continue with Google"
            variant="secondary"
            onPress={() => googleSignIn.mutate()}
            loading={googleSignIn.isPending}
          />
          <Button
            label="New here? Create an account"
            variant="ghost"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </View>
    </Screen>
  );
}
