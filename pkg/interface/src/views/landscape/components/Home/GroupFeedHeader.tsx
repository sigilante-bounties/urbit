import { Box, Row, Text } from '@tlon/indigo-react';
import bigInt from 'big-integer';
import React from 'react';

export function GroupFeedHeader(props) {
  const { baseUrl, history, graphResource, vip } = props;

  let graph = props.graph;
  const historyLocation = history.location.pathname;
  const graphId = `${graphResource.ship.slice(1)}/${graphResource.name}`;

  const isHome =
    historyLocation === baseUrl ||
    historyLocation === `${baseUrl}/feed`;

  const locationUrl =
    history.location.pathname.replace(`${baseUrl}/feed`, '');
  console.log(locationUrl);

  let splitLoc = locationUrl.split('/');
  let indicator = '';
  if (splitLoc.length > 1) {
    splitLoc = splitLoc.slice(1);
    indicator = splitLoc[0];
  }

  const nodeIndex = splitLoc.slice(1).map((ind) => bigInt(ind));
  console.log(nodeIndex);

  let node;
  nodeIndex.forEach((i) => {
    if (!graph) {
      return null;
    }
    node = graph.get(i);
    if (!node) {
      return null;
    }
    graph = node.children;
  });

  let authorText = '';
  if (node) {
    authorText = node.post.author;
  }

  const permText = (vip === 'host-feed')
    ?  'Only host can post'
    : vip === 'admin-feed'
    ? 'Only admins can post'
    : 'Everyone can post';

  return (
    <Row
      flexShrink={0}
      width="100%"
      height="48px"
      pl={2}
      pr={2}
      alignItems="center"
      borderBottom={1}
      borderColor="lightGray"
    >
      <Box display='block'>
        { ( baseUrl !== historyLocation ) ? (
            <Text pl={1} pr={1}
cursor="pointer" onClick={() => {
              let loc =
                history.location.pathname.replace(`${baseUrl}`, '').split('/');
              loc.pop();
              loc = loc.join('/');
              //  TODO: improve
              history.push(`${baseUrl}/feed`);
            }}
            >{'<- Back'}</Text>
          ) : null
        }
      </Box>
      { isHome ? (
        <>
          <Text bold fontSize={2} pl={1} pr={2}>Group Feed</Text>
          <Text fontSize={0} p={1} backgroundColor="washedGray">{permText}</Text>
        </>
      ) : ( !!authorText ? (
        <>
          <Text bold fontSize={2} pl={1} pr={2}>Post by </Text>
          <Text bold fontSize={2} mono>{`~${authorText}`}</Text>
        </>
      ) : (
        <>
          <Text bold fontSize={2} pl={1} pr={2}>{
            indicator.charAt(0).toUpperCase() + indicator.slice(1)
          }</Text>
        </>
      ))}
    </Row>
  );
}

