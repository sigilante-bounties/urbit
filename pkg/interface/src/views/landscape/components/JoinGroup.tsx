import {
  Box, Col,
  Icon,
  ManagedTextInputField as Input, Row,
  Text,
  Button
} from '@tlon/indigo-react';
import { join, MetadataUpdatePreview } from '@urbit/api';
import { Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import _ from 'lodash';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import urbitOb from 'urbit-ob';
import * as Yup from 'yup';
import { useQuery } from '~/logic/lib/useQuery';
import { useWaitForProps } from '~/logic/lib/useWaitForProps';
import { getModuleIcon } from '~/logic/lib/util';
import useGroupState from '~/logic/state/group';
import useMetadataState from '~/logic/state/metadata';
import { AsyncButton } from '~/views/components/AsyncButton';
import { FormError } from '~/views/components/FormError';
import { StatelessAsyncButton } from '~/views/components/StatelessAsyncButton';
import { GroupSummary } from './GroupSummary';
import airlock from '~/logic/api';

const formSchema = Yup.object({
  group: Yup.string()
    .required('Must provide group to join')
    .test('is-valid', 'Invalid group', (group: string | null | undefined) => {
      if (!group) {
        return false;
      }
      const [patp, name] = group.split('/');
      return urbitOb.isValidPatp(patp) && name.length > 0;
    })
});

interface FormSchema {
  group: string;
}

interface JoinGroupProps {
  autojoin?: string;
  dismiss?: () => void;
}

function Autojoin(props: { autojoin: string | null }) {
  const { submitForm } = useFormikContext();

  useEffect(() => {
    if (props.autojoin) {
      submitForm();
    }
  }, []);

  return null;
}

export function JoinGroup(props: JoinGroupProps): ReactElement {
  const { autojoin, dismiss } = props;
  const { associations, getPreview } = useMetadataState();
  const [timedOut, setTimedOut] = useState(false);
  const groups = useGroupState(state => state.groups);
  const history = useHistory();
  const initialValues: FormSchema = {
    group: autojoin || ''
  };
  const [preview, setPreview] = useState<
    MetadataUpdatePreview | string | null
  >(null);

  const waiter = useWaitForProps({ associations, groups }, _.isString(preview) ? 1 : 30000);

  const { query } = useQuery();

  const onConfirm = useCallback(async (group: string) => {
    const [,,ship,name] = group.split('/');
    if (group in groups) {
      return history.push(`/~landscape${group}`);
    }
    await airlock.poke(join(ship, name));
    try {
      await waiter((p) => {
        return group in p.groups &&
          (group in (p.associations?.graph ?? {})
            || group in (p.associations?.groups ?? {}));
      });

      if(query.has('redir')) {
        const redir = query.get('redir')!;
        history.push(redir);
      }

      if(groups?.[group]?.hidden) {
        const { metadata } = associations.graph[group];
        if (metadata?.config && 'graph' in metadata.config) {
          history.push(`/~landscape/home/resource/${metadata.config.graph}${group}`);
        }
        return;
      } else {
        history.push(`/~landscape${group}`);
      }
    } catch (e) {
      setTimedOut(true);
      console.error(e);
    }
  }, [waiter, history, associations, groups]);

  const onSubmit = useCallback(
    async (values: FormSchema, actions: FormikHelpers<FormSchema>) => {
      const [ship, name] = values.group.split('/');
      const path = `/ship/${ship}/${name}`;
      if (path in groups) {
      return history.push(`/~landscape${path}`);
    }
      //  skip if it's unmanaged
      try {
        const prev = await getPreview(path);
        actions.setStatus({ success: null });
        setPreview(prev);
      } catch (e) {
        if (e === 'no-permissions') {
          actions.setStatus({
            error:
              'Unable to join group, you do not have the correct permissions'
          });
        } else if (e === 'offline') {
          setPreview(path);
        } else {
          actions.setStatus({ error: 'Unknown error' });
        }
      }
    },
    [waiter, history, onConfirm]
  );

  return (
    <Col p={3}>
      <Box mb={3}>
        <Text fontSize={2} fontWeight="bold">
          Join a Group
        </Text>
      </Box>
      { timedOut ? (
        <Col width="100%" gapY={4}>
          <Text>The host is not responding. You will receive a notification when the join requests succeeds
          </Text>
          <Button primary onClick={dismiss}>
            Dismiss
          </Button>

        </Col>
      ) : _.isString(preview) ? (

        <Col width="100%" gapY={4}>
          <Text>The host appears to be offline. Join anyway?</Text>
          <StatelessAsyncButton
            primary
            name="join"
            onClick={() => onConfirm(preview)}
          >
            Join anyway
          </StatelessAsyncButton>
        </Col>
      ) : preview ? (
        <>
          <GroupSummary
            metadata={preview.metadata}
            memberCount={preview?.members}
            channelCount={preview?.['channel-count']}
          >
            { Object.keys(preview.channels).length > 0 && (
              <Col
                gapY={2}
                p={2}
                borderRadius={2}
                border={1}
                borderColor="washedGray"
                bg="washedBlue"
                maxHeight="300px"
                overflowY="auto"
              >
                <Text gray fontSize={1}>
                  Channels
                </Text>
                <Box width="100%" flexShrink={0}>
                  {Object.values(preview.channels).map(({ metadata }: any, i) => (
                    <Row key={i} width="100%">
                      <Icon
                        mr={2}
                        color="blue"
                        icon={getModuleIcon(metadata?.config?.graph) as any}
                      />
                      <Text color="blue">{metadata.title} </Text>
                    </Row>
                  ))}
                  </Box>
              </Col>
            )}
          </GroupSummary>
          <StatelessAsyncButton
            marginTop={3}
            primary
            name="join"
            onClick={() => onConfirm(preview.group)}
          >
            Join {preview.metadata.title}
          </StatelessAsyncButton>
        </>
      ) : (
        <Col width="100%" gapY={4}>
          <Formik
            validationSchema={formSchema}
            initialValues={initialValues}
            onSubmit={onSubmit}
          >
            <Form style={{ display: 'contents' }}>
              <Autojoin autojoin={autojoin ?? null} />
              <Input
                id="group"
                label="Group"
                caption="What group are you joining?"
                placeholder="~sampel-palnet/test-group"
              />
              <AsyncButton mt={4}>Join Group</AsyncButton>
              <FormError mt={4} />
            </Form>
          </Formik>
        </Col>
      )}
    </Col>
  );
}
